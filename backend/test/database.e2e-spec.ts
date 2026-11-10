import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Public } from '../src/common/decorators/public.decorator';
import { LoanStatus, ReservationStatus } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createBookWithCopies, createMember, resetDatabase } from './factories';

@Public()
@Controller('prisma-errors')
class PrismaErrorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('missing')
  missing() {
    return this.prisma.member.update({
      where: { id: randomUUID() },
      data: { city: 'Maribor' },
    });
  }

  @Get('duplicate/:email')
  async duplicate(@Param('email') email: string) {
    const data = {
      firstName: 'Janez',
      lastName: 'Novak',
      email,
      passwordHash: 'ni-zgosceno-geslo',
    };
    await this.prisma.member.create({ data });
    return this.prisma.member.create({ data });
  }
}

const loanedOn = new Date('2026-10-12');
const dueDate = new Date('2026-11-02');

describe('Shema in omejitve v bazi', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PrismaErrorsController],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createLoanSetup() {
    const member = await createMember(prisma);
    const librarian = await createMember(prisma, { role: 'LIBRARIAN' });
    const book = await createBookWithCopies(prisma);
    const loan = {
      memberId: member.id,
      librarianId: librarian.id,
      copyId: book.copies[0].id,
      loanedOn,
      dueDate,
    };
    return { member, book, loan };
  }

  describe('shema librarium', () => {
    it('tabele so v shemi librarium, surovi SQL jo uporablja brez predpone', async () => {
      await createMember(prisma);

      const [row] = await prisma.$queryRaw<{ schema: string; n: number }[]>`
        SELECT current_schema() AS schema, count(*)::int AS n FROM member`;
      const tables = await prisma.$queryRaw<{ table_schema: string }[]>`
        SELECT DISTINCT table_schema FROM information_schema.tables
        WHERE table_name IN ('member', 'loan', '_prisma_migrations')`;

      expect(row).toEqual({ schema: 'librarium', n: 1 });
      expect(tables).toEqual([{ table_schema: 'librarium' }]);
    });
  });

  describe('izposoja', () => {
    it('dovoli samo eno odprto izposojo na izvod', async () => {
      const { loan } = await createLoanSetup();
      await prisma.loan.create({ data: loan });

      await expect(
        prisma.loan.create({ data: { ...loan, status: LoanStatus.OVERDUE } }),
      ).rejects.toMatchObject({ code: 'P2002' });
      expect(await prisma.loan.count({ where: { copyId: loan.copyId } })).toBe(
        1,
      );
    });

    it('po vračilu dovoli novo izposojo istega izvoda', async () => {
      const { loan } = await createLoanSetup();
      await prisma.loan.create({
        data: { ...loan, status: LoanStatus.RETURNED, returnedOn: dueDate },
      });

      await prisma.loan.create({ data: loan });

      expect(await prisma.loan.count({ where: { copyId: loan.copyId } })).toBe(
        2,
      );
    });

    it('zavrne več kot 2 podaljšanji', async () => {
      const { loan } = await createLoanSetup();

      await expect(
        prisma.loan.create({ data: { ...loan, extensionCount: 3 } }),
      ).rejects.toThrow();
      await expect(
        prisma.loan.create({ data: { ...loan, extensionCount: -1 } }),
      ).rejects.toThrow();
      expect(await prisma.loan.count()).toBe(0);
    });

    it('zavrne rok vrnitve pred datumom izposoje', async () => {
      const { loan } = await createLoanSetup();

      await expect(
        prisma.loan.create({
          data: { ...loan, dueDate: new Date('2026-10-11') },
        }),
      ).rejects.toThrow();
      expect(await prisma.loan.count()).toBe(0);
    });
  });

  describe('rezervacija', () => {
    it('dovoli samo eno aktivno rezervacijo naslova na člana', async () => {
      const { member, book } = await createLoanSetup();
      const reservation = { memberId: member.id, bookId: book.id };
      await prisma.reservation.create({
        data: { ...reservation, status: ReservationStatus.READY },
      });

      await expect(
        prisma.reservation.create({ data: reservation }),
      ).rejects.toMatchObject({ code: 'P2002' });
      expect(await prisma.reservation.count()).toBe(1);
    });

    it('po preklicu ali prevzemu dovoli novo rezervacijo', async () => {
      const { member, book } = await createLoanSetup();
      const reservation = { memberId: member.id, bookId: book.id };
      await prisma.reservation.create({
        data: { ...reservation, status: ReservationStatus.CANCELLED },
      });
      await prisma.reservation.create({
        data: { ...reservation, status: ReservationStatus.FULFILLED },
      });

      await prisma.reservation.create({ data: reservation });

      expect(await prisma.reservation.count()).toBe(3);
    });
  });

  describe('brisanje', () => {
    it('avtorja, navedenega pri knjigi, ni mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma, 0);

      await expect(
        prisma.author.delete({ where: { id: book.authors[0].authorId } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });

    it('brisanje knjige izbriše tudi povezave z avtorji', async () => {
      const book = await createBookWithCopies(prisma, 0);

      await prisma.book.delete({ where: { id: book.id } });

      expect(await prisma.bookAuthor.count()).toBe(0);
      expect(await prisma.author.count()).toBe(1);
    });
  });

  describe('globalni filter napak Prisma', () => {
    it('P2025 vrne 404', () => {
      return request(app.getHttpServer())
        .get('/prisma-errors/missing')
        .expect(404)
        .expect({ statusCode: 404, message: 'Zapis ne obstaja.' });
    });

    it('P2002 vrne 409', () => {
      return request(app.getHttpServer())
        .get('/prisma-errors/duplicate/maja@example.test')
        .expect(409)
        .expect({
          statusCode: 409,
          message: 'Zapis s temi podatki že obstaja.',
        });
    });
  });
});
