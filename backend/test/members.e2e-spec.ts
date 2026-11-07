import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { ClockService } from '../src/common/clock.service';
import { LoanStatus, Member, Role } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  TODAY,
  createBookWithCopies,
  createLoan,
  createMember,
  createUser,
  login,
  resetDatabase,
  setSettings,
} from './factories';

interface MemberItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

jest.setTimeout(30_000);

describe('US-03 Izposoja: iskanje člana in povzetek', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let librarian: Member;
  let tokens: Record<Role, string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClockService)
      .useValue({ today: () => TODAY })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await setSettings(app);
    const staff = (role: Role) =>
      createUser(prisma, role, { firstName: 'Osebje', lastName: role });
    librarian = await staff(Role.LIBRARIAN);
    const admin = await staff(Role.ADMIN);
    const reader = await staff(Role.READER);
    tokens = {
      LIBRARIAN: await login(app, librarian.email),
      ADMIN: await login(app, admin.email),
      READER: await login(app, reader.email),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const search = (q?: string, role: Role = Role.LIBRARIAN) =>
    http()
      .get('/members')
      .query(q === undefined ? {} : { q })
      .set('Authorization', `Bearer ${tokens[role]}`);
  const summary = (id: string, role: Role = Role.LIBRARIAN) =>
    http()
      .get(`/members/${id}/summary`)
      .set('Authorization', `Bearer ${tokens[role]}`);
  const names = async (q: string) =>
    ((await search(q).expect(200)).body as MemberItem[]).map(
      (m) => `${m.firstName} ${m.lastName}`,
    );

  describe('AC1: iskanje člana po imenu ali e-pošti (GET /members)', () => {
    let maja: Member;

    beforeEach(async () => {
      maja = await createMember(prisma, {
        firstName: 'Maja',
        lastName: 'Kovač',
        email: 'maja.kovac@example.com',
      });
      await createMember(prisma, {
        firstName: 'Janez',
        lastName: 'Novak',
        email: 'janez.novak@example.com',
      });
      await createMember(prisma, {
        firstName: 'Luka',
        lastName: 'Zupan',
        email: 'luka.zupan@example.com',
      });
    });

    it('najde člana po imenu, priimku ali delu e-pošte ne glede na velike črke', async () => {
      expect(await names('maja')).toEqual(['Maja Kovač']);
      expect(await names('NOVAK')).toEqual(['Janez Novak']);
      expect(await names('luka.z')).toEqual(['Luka Zupan']);
      expect(await names('JANEZ.NOVAK@EXAMPLE.COM')).toEqual(['Janez Novak']);
    });

    it('vse besede se morajo ujemati z istim članom', async () => {
      expect(await names('  kovač   maja ')).toEqual(['Maja Kovač']);
      expect(await names('maja novak')).toEqual([]);
    });

    it('zadetek vsebuje samo podatke za prikaz, brez gesla', async () => {
      const res = await search('maja').expect(200);

      expect(res.body).toEqual([
        {
          id: maja.id,
          firstName: 'Maja',
          lastName: 'Kovač',
          email: 'maja.kovac@example.com',
          role: Role.READER,
        },
      ]);
    });

    it('vrne največ 20 članov, urejenih po priimku in imenu', async () => {
      await prisma.member.createMany({
        data: Array.from({ length: 25 }, (_, i) => ({
          firstName: 'Test',
          lastName: `Clan ${String(25 - i).padStart(2, '0')}`,
          email: `clan${i}@example.test`,
          passwordHash: 'ni-zgosceno-geslo',
        })),
      });

      expect(await names('clan')).toEqual(
        Array.from(
          { length: 20 },
          (_, i) => `Test Clan ${String(i + 1).padStart(2, '0')}`,
        ),
      );
    });

    it('predolg iskalni niz vrne 400 z napako ob polju q', async () => {
      const res = await search('a'.repeat(101)).expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: 'Neveljavni podatki',
        errors: { q: 'Iskalni niz je lahko dolg največ 100 znakov' },
      });
    });
  });

  describe('AC1, AC2: povzetek člana (GET /members/:id/summary)', () => {
    let member: Member;

    beforeEach(async () => {
      member = await createMember(prisma, {
        firstName: 'Janez',
        lastName: 'Novak',
        email: 'janez.novak@example.com',
      });
    });

    const loans = async (
      ...items: Omit<
        Parameters<typeof createLoan>[1],
        'memberId' | 'librarianId' | 'copyId'
      >[]
    ) => {
      const book = await createBookWithCopies(prisma, items.length);
      for (const [i, item] of items.entries()) {
        await createLoan(prisma, {
          memberId: member.id,
          librarianId: librarian.id,
          copyId: book.copies[i].id,
          ...item,
        });
      }
    };

    it('AC1: vrne člana, število aktivnih izposoj in mejo iz nastavitev', async () => {
      await setSettings(app, { max_active_loans: '4' });
      await loans(
        { status: LoanStatus.ACTIVE, dueDate: '2026-11-02' },
        { status: LoanStatus.ACTIVE, dueDate: '2026-10-20' },
        { status: LoanStatus.RETURNED },
      );

      const res = await summary(member.id).expect(200);

      expect(res.body).toEqual({
        id: member.id,
        firstName: 'Janez',
        lastName: 'Novak',
        email: 'janez.novak@example.com',
        role: Role.READER,
        activeLoans: 2,
        maxActiveLoans: 4,
        unpaidFine: '0.00',
        isBlocked: false,
      });
    });

    it('AC2: neplačana zamudnina sešteje neplačane zamudnine vrnjenih in sprotno zamudnino zamujenih izposoj', async () => {
      await setSettings(app, { fine_per_day: '0.10' });
      await loans(
        { status: LoanStatus.RETURNED, fineAmount: '0.30' },
        { status: LoanStatus.RETURNED, fineAmount: '1.00', finePaid: true },
        { status: LoanStatus.RETURNED, fineAmount: '2.00', fineWaived: true },
        // 5 dni zamude
        { status: LoanStatus.ACTIVE, dueDate: '2026-10-07' },
        // 1 dan zamude
        { status: LoanStatus.OVERDUE, dueDate: '2026-10-11' },
        // rok je danes
        { status: LoanStatus.ACTIVE, dueDate: TODAY },
      );
      const other = await createMember(prisma);
      const book = await createBookWithCopies(prisma);
      await createLoan(prisma, {
        memberId: other.id,
        librarianId: librarian.id,
        copyId: book.copies[0].id,
        status: LoanStatus.RETURNED,
        fineAmount: '9.99',
      });

      const res = await summary(member.id).expect(200);

      // 0,30 € + 5 × 0,10 € + 1 × 0,10 €
      expect(res.body).toMatchObject({ activeLoans: 3, unpaidFine: '0.90' });
    });

    it('AC2: sprotno zamudnino računa z zamudnino na dan iz nastavitev', async () => {
      await setSettings(app, { fine_per_day: '0.25' });
      await loans({ status: LoanStatus.ACTIVE, dueDate: '2026-10-10' });

      const res = await summary(member.id).expect(200);

      expect(res.body).toMatchObject({ activeLoans: 1, unpaidFine: '0.50' });
    });

    it('AC2: blokiran član ima isBlocked: true', async () => {
      await prisma.member.update({
        where: { id: member.id },
        data: { isBlocked: true },
      });

      const res = await summary(member.id).expect(200);

      expect(res.body).toMatchObject({ isBlocked: true });
    });

    it('za neobstoječega člana ali neveljaven ID vrne 404 »Član ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await summary(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Član ne obstaja.' });
      }
    });
  });

  describe('dostop', () => {
    it('bralec dobi 404 »Ta stran ne obstaja« pri iskanju in povzetku', async () => {
      for (const send of [
        () => search('maja', Role.READER),
        () => summary(librarian.id, Role.READER),
      ]) {
        const res = await send().expect(404);
        expect(res.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      }
    });

    it('brez prijave vrne 401', async () => {
      await http().get('/members').expect(401);
      await http().get(`/members/${librarian.id}/summary`).expect(401);
    });

    it('administrator lahko išče člane in vidi povzetek', async () => {
      await search('osebje', Role.ADMIN).expect(200);
      await summary(librarian.id, Role.ADMIN).expect(200);
    });
  });
});
