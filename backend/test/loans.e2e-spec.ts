import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { ClockService } from '../src/common/clock.service';
import { toDbDate } from '../src/common/dates';
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

  describe('evidentiranje izposoje (POST /loans)', () => {
    const send = (
      body: { memberId: string; inventoryNumber: string },
      role: Role = Role.LIBRARIAN,
    ) =>
      http()
        .post('/loans')
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send(body);
    const borrow = (
      memberId = member.id,
      inventoryNumber = copy.inventoryNumber,
    ) => send({ memberId, inventoryNumber });
    const copyStatus = async (id = copy.id) =>
      (await prisma.copy.findUniqueOrThrow({ where: { id } })).status;
    const reservation = (id: string) =>
      prisma.reservation.findUniqueOrThrow({ where: { id } });
    const reserveFor = (
      memberId: string,
      status: ReservationStatus,
      reserved: Copy | null = null,
      createdAt = new Date('2026-10-01T10:00:00Z'),
    ) =>
      prisma.reservation.create({
        data: {
          memberId,
          bookId: copy.bookId,
          copyId: reserved?.id ?? null,
          status,
          createdAt,
        },
      });

    // ob zavrnitvi se ne ustvari izposoja in izvod ostane, kot je bil
    const expectRejected = async (
      res: request.Response,
      message: string,
      status: CopyStatus = CopyStatus.AVAILABLE,
    ) => {
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ statusCode: 409, message });
      expect(await prisma.loan.count({ where: { copyId: copy.id } })).toBe(0);
      expect(await copyStatus()).toBe(status);
    };

    it('AC1: evidentira izposojo z rokom danes + 21 dni in prijavljenim knjižničarjem', async () => {
      const res = await borrow().expect(201);

      const book = await prisma.book.findUniqueOrThrow({
        where: { id: copy.bookId },
      });
      expect(res.body).toEqual({
        id: expect.any(String) as string,
        memberId: member.id,
        inventoryNumber: copy.inventoryNumber,
        title: book.title,
        loanedOn: TODAY,
        dueDate: '2026-11-02',
        status: LoanStatus.ACTIVE,
      });
      const loan = await prisma.loan.findUniqueOrThrow({
        where: { id: (res.body as { id: string }).id },
      });
      expect(loan).toMatchObject({
        memberId: member.id,
        copyId: copy.id,
        librarianId: librarian.id,
        extensionCount: 0,
        returnedOn: null,
      });
    });

    it('AC1: rok vrnitve vzame iz loan_period_days v nastavitvah', async () => {
      await setSettings(app, { loan_period_days: '14' });

      const res = await borrow().expect(201);

      expect(res.body).toMatchObject({ dueDate: '2026-10-26' });
    });

    it('AC2: zavrne blokiranega člana s 409 »Član je blokiran.«', async () => {
      await prisma.member.update({
        where: { id: member.id },
        data: { isBlocked: true },
      });

      await expectRejected(await borrow(), 'Član je blokiran.');
    });

    it('AC2: zavrne šesto izposojo z razlogom »Član ima 5 aktivnih izposoj, kar je največ dovoljeno.«', async () => {
      for (let i = 0; i < 5; i++) await addLoan(member.id);

      await expectRejected(
        await borrow(),
        'Član ima 5 aktivnih izposoj, kar je največ dovoljeno.',
      );
      expect(await prisma.loan.count({ where: { memberId: member.id } })).toBe(
        5,
      );
    });

    it('AC2: zavrne člana z neplačano zamudnino nad 5,00 €, pri 5,00 € izposodi', async () => {
      await addLoan(member.id, {
        status: LoanStatus.RETURNED,
        fineAmount: '5.01',
      });

      await expectRejected(
        await borrow(),
        'Član ima neplačano zamudnino 5,01 €, kar presega mejo 5,00 €.',
      );

      await prisma.loan.updateMany({
        where: { memberId: member.id },
        data: { fineAmount: '5.00' },
      });
      await borrow().expect(201);
    });

    it('AC2: pri več neizpolnjenih pravilih izpiše razlog prvega', async () => {
      await prisma.member.update({
        where: { id: member.id },
        data: { isBlocked: true },
      });
      for (let i = 0; i < 5; i++) await addLoan(member.id);

      await expectRejected(await borrow(), 'Član je blokiran.');
    });

    it('AC3: izvod, rezerviran za drugega člana, zavrne in rezervacije ne spremeni', async () => {
      const other = await createMember(prisma);
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await reserveFor(other.id, ReservationStatus.READY, copy);

      await expectRejected(
        await borrow(),
        `Izvod ${copy.inventoryNumber} je rezerviran za drugega člana.`,
        CopyStatus.RESERVED,
      );
      expect(await reservation(ready.id)).toMatchObject({
        status: ReservationStatus.READY,
        copyId: copy.id,
      });
    });

    it('AC4: zavrne izposojo naslova, ki ga ima član že izposojenega', async () => {
      await createLoan(prisma, {
        memberId: member.id,
        librarianId: librarian.id,
        copyId: sibling.id,
        status: LoanStatus.ACTIVE,
        dueDate: '2026-11-02',
      });

      await expectRejected(await borrow(), 'Član ima ta naslov že izposojen.');
    });

    it('zavrne izposojen izvod s 409 »Izvod … je že izposojen.«', async () => {
      const first = await createMember(prisma);
      await borrow(first.id).expect(201);

      const res = await borrow().expect(409);

      expect(res.body).toMatchObject({
        message: `Izvod ${copy.inventoryNumber} je že izposojen.`,
      });
      expect(await prisma.loan.count({ where: { copyId: copy.id } })).toBe(1);
    });

    it('AC5: izvod ima po izposoji stanje Izposojen', async () => {
      await borrow().expect(201);

      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);
    });

    it('AC5: rezervirani izvod izposodi članu, rezervacija dobi stanje Izposojena', async () => {
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await reserveFor(member.id, ReservationStatus.READY, copy);

      await borrow().expect(201);

      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);
      expect(await reservation(ready.id)).toMatchObject({
        status: ReservationStatus.FULFILLED,
      });
    });

    it('AC5: če član vzame drug izvod, gre zanj rezervirani izvod prvemu v vrsti', async () => {
      // zanj je rezerviran sibling, izposodi pa si prosti copy
      await prisma.copy.update({
        where: { id: sibling.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await reserveFor(
        member.id,
        ReservationStatus.READY,
        sibling,
      );
      const [second, first] = [
        await createMember(prisma),
        await createMember(prisma),
      ];
      const later = await reserveFor(
        second.id,
        ReservationStatus.WAITING,
        null,
        new Date('2026-10-05T10:00:00Z'),
      );
      const earlier = await reserveFor(
        first.id,
        ReservationStatus.WAITING,
        null,
        new Date('2026-10-03T10:00:00Z'),
      );

      await borrow().expect(201);

      expect(await reservation(ready.id)).toMatchObject({
        status: ReservationStatus.FULFILLED,
      });
      expect(await reservation(earlier.id)).toMatchObject({
        status: ReservationStatus.READY,
        copyId: sibling.id,
        readyUntil: toDbDate('2026-10-15'),
      });
      expect(await reservation(later.id)).toMatchObject({
        status: ReservationStatus.WAITING,
        copyId: null,
      });
      expect(await copyStatus(sibling.id)).toBe(CopyStatus.RESERVED);
      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);
    });

    it('AC5: brez čakajočih je drug rezervirani izvod spet prost', async () => {
      await prisma.copy.update({
        where: { id: sibling.id },
        data: { status: CopyStatus.RESERVED },
      });
      await reserveFor(member.id, ReservationStatus.READY, sibling);

      await borrow().expect(201);

      expect(await copyStatus(sibling.id)).toBe(CopyStatus.AVAILABLE);
    });

    it('sočasni izposoji istega izvoda: uspe samo ena', async () => {
      const [a, b] = [await createMember(prisma), await createMember(prisma)];

      const results = await Promise.all([borrow(a.id), borrow(b.id)]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body).toMatchObject({
        message: `Izvod ${copy.inventoryNumber} je že izposojen.`,
      });
      expect(await prisma.loan.count({ where: { copyId: copy.id } })).toBe(1);
      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);
    });

    it('sočasni izposoji istemu članu pri 4 od 5 izposoj: uspe samo ena', async () => {
      for (let i = 0; i < 4; i++) await addLoan(member.id);

      const results = await Promise.all([
        borrow(member.id, copy.inventoryNumber),
        borrow(
          member.id,
          (await createBookWithCopies(prisma)).copies[0].inventoryNumber,
        ),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body).toMatchObject({
        message: 'Član ima 5 aktivnih izposoj, kar je največ dovoljeno.',
      });
      expect(
        await prisma.loan.count({
          where: { memberId: member.id, status: LoanStatus.ACTIVE },
        }),
      ).toBe(5);
    });

    it('za neobstoječega člana ali izvod vrne 404, brez podatkov 400', async () => {
      const noMember = await borrow(randomUUID()).expect(404);
      expect(noMember.body).toMatchObject({ message: 'Član ne obstaja.' });

      const noCopy = await borrow(member.id, 'INV-999999').expect(404);
      expect(noCopy.body).toMatchObject({
        message: 'Izvod INV-999999 ne obstaja.',
      });

      const invalid = await borrow('ni-uuid', '').expect(400);
      expect(invalid.body).toMatchObject({
        errors: {
          memberId: 'Izberi člana',
          inventoryNumber: 'Vnesi inventarno številko',
        },
      });
      expect(await prisma.loan.count()).toBe(0);
    });

    it('bralec dobi 404 »Ta stran ne obstaja«, brez prijave 401, administrator lahko izposodi', async () => {
      const body = {
        memberId: member.id,
        inventoryNumber: copy.inventoryNumber,
      };

      const reader = await send(body, Role.READER).expect(404);
      expect(reader.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      await http().post('/loans').send(body).expect(401);
      expect(await prisma.loan.count()).toBe(0);

      await send(body, Role.ADMIN).expect(201);
    });
  });
});
