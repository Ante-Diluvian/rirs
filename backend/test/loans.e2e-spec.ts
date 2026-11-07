import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { ClockService } from '../src/common/clock.service';
import {
  Copy,
  CopyStatus,
  LoanStatus,
  Member,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { LoanRule } from '../src/loans/loan-policy';
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

interface LoanCheck {
  checks: { rule: LoanRule; passed: boolean; message: string }[];
  dueDate: string;
  loanPeriodDays: number;
}

jest.setTimeout(30_000);

describe('US-03 Izposoja s preverjanjem pravil', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let librarian: Member;
  let tokens: Record<Role, string>;
  let member: Member;
  // dva izvoda istega naslova
  let copy: Copy;
  let sibling: Copy;

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
    await setSettings(app, {
      loan_period_days: '21',
      fine_per_day: '0.10',
      max_active_loans: '5',
      fine_limit: '5.00',
    });
    librarian = await createUser(prisma, Role.LIBRARIAN);
    const admin = await createUser(prisma, Role.ADMIN);
    const reader = await createUser(prisma, Role.READER);
    tokens = {
      LIBRARIAN: await login(app, librarian.email),
      ADMIN: await login(app, admin.email),
      READER: await login(app, reader.email),
    };
    member = await createMember(prisma);
    [copy, sibling] = (await createBookWithCopies(prisma, 2)).copies;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('preverjanje pravil (POST /loans/check)', () => {
    const send = (body: object, role: Role = Role.LIBRARIAN) =>
      http()
        .post('/loans/check')
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send(body);
    const check = async (
      memberId = member.id,
      inventoryNumber = copy.inventoryNumber,
    ) =>
      (await send({ memberId, inventoryNumber }).expect(200)).body as LoanCheck;
    const result = async (rule: LoanRule, memberId?: string) =>
      (await check(memberId)).checks.find((c) => c.rule === rule);

    // vsaka izposoja je iz drugega naslova, rok še ni potekel
    const addLoan = async (
      memberId: string,
      data: Partial<Parameters<typeof createLoan>[1]> = {},
    ) => {
      const book = await createBookWithCopies(prisma);
      return createLoan(prisma, {
        memberId,
        librarianId: librarian.id,
        copyId: book.copies[0].id,
        status: LoanStatus.ACTIVE,
        dueDate: '2026-11-02',
        ...data,
      });
    };

    it('AC1: za prost izvod so izpolnjena vsa pravila, rok vrnitve je danes + 21 dni', async () => {
      const res = await send({
        memberId: member.id,
        inventoryNumber: ` ${copy.inventoryNumber} `,
      }).expect(200);

      expect(res.body).toEqual({
        checks: [
          {
            rule: LoanRule.MEMBER_NOT_BLOCKED,
            passed: true,
            message: 'Član ni blokiran',
          },
          {
            rule: LoanRule.MAX_ACTIVE_LOANS,
            passed: true,
            message: 'Manj kot 5 aktivnih izposoj',
          },
          {
            rule: LoanRule.FINE_LIMIT,
            passed: true,
            message: 'Zamudnina do 5,00 €',
          },
          {
            rule: LoanRule.COPY_AVAILABLE,
            passed: true,
            message: 'Izvod je prost',
          },
          {
            rule: LoanRule.SAME_TITLE,
            passed: true,
            message: 'Član nima izposojenega istega naslova',
          },
        ],
        dueDate: '2026-11-02',
        loanPeriodDays: 21,
      });
    });

    it('AC1: rok vrnitve izračuna iz loan_period_days v nastavitvah', async () => {
      await setSettings(app, { loan_period_days: '30' });

      expect(await check()).toMatchObject({
        dueDate: '2026-11-11',
        loanPeriodDays: 30,
      });
    });

    it('AC2: blokiranemu članu izposoje ne dovoli', async () => {
      await prisma.member.update({
        where: { id: member.id },
        data: { isBlocked: true },
      });

      expect(await result(LoanRule.MEMBER_NOT_BLOCKED)).toEqual({
        rule: LoanRule.MEMBER_NOT_BLOCKED,
        passed: false,
        message: 'Član je blokiran.',
      });
    });

    it('AC2: s 4 aktivnimi izposojami dovoli, s 5 izpiše »Član ima 5 aktivnih izposoj, kar je največ dovoljeno.«', async () => {
      for (let i = 0; i < 4; i++) await addLoan(member.id);
      await addLoan(member.id, { status: LoanStatus.RETURNED });

      expect(await result(LoanRule.MAX_ACTIVE_LOANS)).toMatchObject({
        passed: true,
      });

      await addLoan(member.id);

      expect(await result(LoanRule.MAX_ACTIVE_LOANS)).toEqual({
        rule: LoanRule.MAX_ACTIVE_LOANS,
        passed: false,
        message: 'Član ima 5 aktivnih izposoj, kar je največ dovoljeno.',
      });
    });

    it('AC2: neplačano zamudnino 5,00 € dovoli, 5,01 € zavrne z razlogom', async () => {
      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '5.00',
      });

      expect(await result(LoanRule.FINE_LIMIT)).toMatchObject({
        passed: true,
      });

      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '0.01',
      });

      expect(await result(LoanRule.FINE_LIMIT)).toEqual({
        rule: LoanRule.FINE_LIMIT,
        passed: false,
        message:
          'Član ima neplačano zamudnino 5,01 €, kar presega mejo 5,00 €.',
      });
    });

    it('AC2: zamudnini prišteje sprotno zamudnino zamujenih izposoj, plačane in odpuščene ne', async () => {
      // 41 dni zamude × 0,10 € = 4,10 €
      await addLoan(member.id, { dueDate: '2026-09-01' });
      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '1.00',
      });
      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '9.00',
        finePaid: true,
      });
      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '9.00',
        fineWaived: true,
      });

      expect(await result(LoanRule.FINE_LIMIT)).toMatchObject({
        passed: false,
        message:
          'Član ima neplačano zamudnino 5,10 €, kar presega mejo 5,00 €.',
      });
    });

    it('AC3: rezerviran izvod izposodi samo članu, za katerega je rezerviran', async () => {
      const other = await createMember(prisma);
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      await prisma.reservation.create({
        data: {
          memberId: member.id,
          bookId: copy.bookId,
          copyId: copy.id,
          status: ReservationStatus.READY,
        },
      });

      expect(await result(LoanRule.COPY_AVAILABLE)).toMatchObject({
        passed: true,
        message: 'Izvod je rezerviran za tega člana',
      });
      expect(await result(LoanRule.COPY_AVAILABLE, other.id)).toEqual({
        rule: LoanRule.COPY_AVAILABLE,
        passed: false,
        message: `Izvod ${copy.inventoryNumber} je rezerviran za drugega člana.`,
      });
    });

    it('AC4: zavrne, če ima član isti naslov že izposojen, vrnjen naslov ne šteje', async () => {
      const loan = await createLoan(prisma, {
        memberId: member.id,
        librarianId: librarian.id,
        copyId: sibling.id,
        status: LoanStatus.RETURNED,
      });

      expect(await result(LoanRule.SAME_TITLE)).toMatchObject({
        passed: true,
      });

      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.ACTIVE, returnedOn: null },
      });

      expect(await result(LoanRule.SAME_TITLE)).toEqual({
        rule: LoanRule.SAME_TITLE,
        passed: false,
        message: 'Član ima ta naslov že izposojen.',
      });
    });

    it('izposojen ali izgubljen izvod ne izpolni pravila o izvodu', async () => {
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.LOST },
      });
      expect(await result(LoanRule.COPY_AVAILABLE)).toMatchObject({
        passed: false,
        message: `Izvod ${copy.inventoryNumber} je označen kot izgubljen.`,
      });

      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.ON_LOAN },
      });
      await createLoan(prisma, {
        memberId: (await createMember(prisma)).id,
        librarianId: librarian.id,
        copyId: copy.id,
        status: LoanStatus.ACTIVE,
      });
      expect(await result(LoanRule.COPY_AVAILABLE)).toMatchObject({
        passed: false,
        message: `Izvod ${copy.inventoryNumber} je že izposojen.`,
      });
    });

    it('preverjanje ne ustvari izposoje in ne spremeni izvoda', async () => {
      await check();

      expect(await prisma.loan.count()).toBe(0);
      expect(
        (await prisma.copy.findUniqueOrThrow({ where: { id: copy.id } }))
          .status,
      ).toBe(CopyStatus.AVAILABLE);
    });

    it('za neobstoječega člana ali izvod vrne 404 s sporočilom', async () => {
      const noMember = await send({
        memberId: randomUUID(),
        inventoryNumber: copy.inventoryNumber,
      }).expect(404);
      expect(noMember.body).toMatchObject({ message: 'Član ne obstaja.' });

      const noCopy = await send({
        memberId: member.id,
        inventoryNumber: 'INV-999999',
      }).expect(404);
      expect(noCopy.body).toMatchObject({
        message: 'Izvod INV-999999 ne obstaja.',
      });
    });

    it('brez člana in inventarne številke vrne 400 z napakami ob poljih', async () => {
      const res = await send({ memberId: 'ni-uuid', inventoryNumber: ' ' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        message: 'Neveljavni podatki',
        errors: {
          memberId: 'Izberi člana',
          inventoryNumber: 'Vnesi inventarno številko',
        },
      });
    });

    it('bralec dobi 404 »Ta stran ne obstaja«, brez prijave 401, administrator 200', async () => {
      const body = {
        memberId: member.id,
        inventoryNumber: copy.inventoryNumber,
      };

      const reader = await send(body, Role.READER).expect(404);
      expect(reader.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      await http().post('/loans/check').send(body).expect(401);
      await send(body, Role.ADMIN).expect(200);
    });
  });
});
