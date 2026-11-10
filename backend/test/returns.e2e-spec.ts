import { INestApplication, Logger } from '@nestjs/common';
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
  Prisma,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReservationQueueService } from '../src/reservations/reservation-queue.service';
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

interface ReturnPreview {
  loanId: string;
  inventoryNumber: string;
  title: string;
  member: { id: string; firstName: string; lastName: string };
  loanedOn: string;
  dueDate: string;
  returnedOn: string;
  overdueDays: number;
  finePerDay: string;
  fine: string;
}

interface ReturnResult extends ReturnPreview {
  copyStatus: CopyStatus;
  reservedFor: {
    reservationId: string;
    memberId: string;
    firstName: string;
    lastName: string;
    readyUntil: string;
  } | null;
}

jest.setTimeout(30_000);

describe('US-04 Vračilo in samodejni izračun zamudnine', () => {
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
    await setSettings(app, { fine_per_day: '0.10', pickup_days: '3' });
    librarian = await createUser(prisma, Role.LIBRARIAN);
    const admin = await createUser(prisma, Role.ADMIN);
    const reader = await createUser(prisma, Role.READER);
    tokens = {
      LIBRARIAN: await login(app, librarian.email),
      ADMIN: await login(app, admin.email),
      READER: await login(app, reader.email),
    };
    member = await createMember(prisma, {
      firstName: 'Janez',
      lastName: 'Novak',
    });
    [copy, sibling] = (await createBookWithCopies(prisma, 2)).copies;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  // izvod je izposojen članu z danim rokom (privzeto 5 dni zamude kot na W-05)
  const lend = async (
    target: Copy = copy,
    dueDate = '2026-10-07',
    memberId = member.id,
  ) => {
    await prisma.copy.update({
      where: { id: target.id },
      data: { status: CopyStatus.ON_LOAN },
    });
    return createLoan(prisma, {
      memberId,
      librarianId: librarian.id,
      copyId: target.id,
      status: LoanStatus.ACTIVE,
      dueDate,
    });
  };

  const reserve = async (
    firstName: string,
    lastName: string,
    createdAt: string,
    data: Partial<Prisma.ReservationUncheckedCreateInput> = {},
  ) => {
    const reader = await createMember(prisma, { firstName, lastName });
    return prisma.reservation.create({
      data: {
        memberId: reader.id,
        bookId: copy.bookId,
        status: ReservationStatus.WAITING,
        createdAt: new Date(createdAt),
        ...data,
      },
    });
  };

  const loanById = (id: string) =>
    prisma.loan.findUniqueOrThrow({ where: { id } });
  const copyStatus = async (id = copy.id) =>
    (await prisma.copy.findUniqueOrThrow({ where: { id } })).status;
  const reservation = (id: string) =>
    prisma.reservation.findUniqueOrThrow({ where: { id } });

  describe('predogled vračila (GET /loans/return-preview)', () => {
    const preview = (inventoryNumber: string, role: Role = Role.LIBRARIAN) =>
      http()
        .get('/loans/return-preview')
        .query({ inventoryNumber })
        .set('Authorization', `Bearer ${tokens[role]}`);

    it('AC1: za izposojen izvod izpiše člana, naslov, rok vrnitve in število dni zamude', async () => {
      const loan = await lend();

      const res = await preview(copy.inventoryNumber).expect(200);

      expect(res.body).toEqual({
        loanId: loan.id,
        inventoryNumber: copy.inventoryNumber,
        title: '1984',
        member: { id: member.id, firstName: 'Janez', lastName: 'Novak' },
        loanedOn: '2026-09-16',
        dueDate: '2026-10-07',
        returnedOn: TODAY,
        overdueDays: 5,
        finePerDay: '0.10',
        fine: '0.50',
      } satisfies ReturnPreview);
    });

    it('AC1: predogled ničesar ne spremeni', async () => {
      const loan = await lend();

      await preview(copy.inventoryNumber).expect(200);

      expect(await loanById(loan.id)).toMatchObject({
        status: LoanStatus.ACTIVE,
        returnedOn: null,
      });
      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);
    });

    it('AC2: pri vračilu v roku in na dan roka je zamudnina 0,00 €, 3 dni po roku 0,30 €', async () => {
      const cases = [
        { dueDate: '2026-11-02', overdueDays: 0, fine: '0.00' },
        { dueDate: TODAY, overdueDays: 0, fine: '0.00' },
        { dueDate: '2026-10-09', overdueDays: 3, fine: '0.30' },
      ];
      for (const { dueDate, overdueDays, fine } of cases) {
        await prisma.loan.deleteMany();
        await lend(copy, dueDate);

        const res = await preview(copy.inventoryNumber).expect(200);

        expect(res.body).toMatchObject({ dueDate, overdueDays, fine });
      }
    });

    it('AC2: zamudnino na dan vzame iz fine_per_day v nastavitvah', async () => {
      await setSettings(app, { fine_per_day: '0.25' });
      await lend();

      const res = await preview(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({
        overdueDays: 5,
        finePerDay: '0.25',
        fine: '1.25',
      });
    });

    it('AC4: za izvod, ki ni izposojen, vrne 404 »Izvod … ni izposojen«', async () => {
      // vrnjena izposoja v zgodovini ne šteje kot odprta
      await createLoan(prisma, {
        memberId: member.id,
        librarianId: librarian.id,
        copyId: copy.id,
        status: LoanStatus.RETURNED,
      });

      const res = await preview(copy.inventoryNumber).expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        message: `Izvod ${copy.inventoryNumber} ni izposojen`,
      });
    });

    it('za neobstoječ izvod vrne 404 »Izvod … ne obstaja.«, brez inventarne številke 400', async () => {
      const missing = await preview('INV-999999').expect(404);
      expect(missing.body).toMatchObject({
        message: 'Izvod INV-999999 ne obstaja.',
      });

      const empty = await preview('  ').expect(400);
      expect(empty.body).toMatchObject({
        errors: { inventoryNumber: 'Vnesi inventarno številko' },
      });
    });

    it('bralec dobi 404 »Ta stran ne obstaja«, brez prijave 401, administrator 200', async () => {
      await lend();

      const reader = await preview(copy.inventoryNumber, Role.READER).expect(
        404,
      );
      expect(reader.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      await http()
        .get('/loans/return-preview')
        .query({ inventoryNumber: copy.inventoryNumber })
        .expect(401);
      await preview(copy.inventoryNumber, Role.ADMIN).expect(200);
    });
  });

  describe('vračilo (POST /loans/return)', () => {
    const send = (inventoryNumber: string, role: Role = Role.LIBRARIAN) =>
      http()
        .post('/loans/return')
        .set('Authorization', `Bearer ${tokens[role]}`)
        .send({ inventoryNumber });

    it('AC1, AC2: zapre izposojo z današnjim datumom vračila in zamudnino 0,50 € (5 × 0,10 €)', async () => {
      const loan = await lend();

      const res = await send(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({
        loanId: loan.id,
        member: { id: member.id, firstName: 'Janez', lastName: 'Novak' },
        title: '1984',
        dueDate: '2026-10-07',
        returnedOn: TODAY,
        overdueDays: 5,
        finePerDay: '0.10',
        fine: '0.50',
      } satisfies Partial<ReturnResult>);
      const saved = await loanById(loan.id);
      expect(saved).toMatchObject({
        status: LoanStatus.RETURNED,
        returnedOn: toDbDate(TODAY),
        finePaid: false,
        fineWaived: false,
      });
      expect(saved.fineAmount.toFixed(2)).toBe('0.50');
    });

    it('AC2: pri vračilu v roku shrani zamudnino 0,00 €', async () => {
      const loan = await lend(copy, '2026-11-02');

      const res = await send(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({ overdueDays: 0, fine: '0.00' });
      expect((await loanById(loan.id)).fineAmount.toFixed(2)).toBe('0.00');
    });

    it('AC3: brez čakajočih rezervacij dobi izvod stanje Prost', async () => {
      await lend();
      // preklicana rezervacija ni v vrsti
      await reserve('Petra', 'Zajc', '2026-10-01T10:00:00Z', {
        status: ReservationStatus.CANCELLED,
      });

      const res = await send(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({
        copyStatus: CopyStatus.AVAILABLE,
        reservedFor: null,
      });
      expect(await copyStatus()).toBe(CopyStatus.AVAILABLE);
    });

    it('AC3: izvod dodeli najstarejši čakajoči rezervaciji (Na voljo, rok prevzema 3 dni) in vrne njenega člana', async () => {
      await lend();
      const later = await reserve('Petra', 'Zajc', '2026-10-05T10:00:00Z');
      const oldest = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');

      const res = await send(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({
        copyStatus: CopyStatus.RESERVED,
        reservedFor: {
          reservationId: oldest.id,
          memberId: oldest.memberId,
          firstName: 'Luka',
          lastName: 'Zupan',
          readyUntil: '2026-10-15',
        },
      } satisfies Partial<ReturnResult>);
      expect(await reservation(oldest.id)).toMatchObject({
        status: ReservationStatus.READY,
        copyId: copy.id,
        readyUntil: toDbDate('2026-10-15'),
      });
      expect(await reservation(later.id)).toMatchObject({
        status: ReservationStatus.WAITING,
        copyId: null,
      });
      expect(await copyStatus()).toBe(CopyStatus.RESERVED);
    });

    it('AC3: rok prevzema vzame iz pickup_days v nastavitvah', async () => {
      await setSettings(app, { pickup_days: '5' });
      await lend();
      const waiting = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');

      const res = await send(copy.inventoryNumber).expect(200);

      expect(res.body).toMatchObject({
        reservedFor: { readyUntil: '2026-10-17' },
      });
      expect(await reservation(waiting.id)).toMatchObject({
        readyUntil: toDbDate('2026-10-17'),
      });
    });

    it('AC4: za prost izvod vrne 409 »Izvod … ni izposojen« in ničesar ne spremeni', async () => {
      const returned = await createLoan(prisma, {
        memberId: member.id,
        librarianId: librarian.id,
        copyId: copy.id,
        status: LoanStatus.RETURNED,
        fineAmount: '0.20',
      });
      const waiting = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');

      const res = await send(copy.inventoryNumber).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message: `Izvod ${copy.inventoryNumber} ni izposojen`,
      });
      expect(await loanById(returned.id)).toEqual(returned);
      expect(await prisma.loan.count()).toBe(1);
      expect(await reservation(waiting.id)).toEqual(waiting);
      expect(await copyStatus()).toBe(CopyStatus.AVAILABLE);
    });

    it('AC4: za izvod, rezerviran za člana, vrne 409 in rezervacije ne spremeni', async () => {
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z', {
        status: ReservationStatus.READY,
        copyId: copy.id,
        readyUntil: toDbDate('2026-10-14'),
      });

      const res = await send(copy.inventoryNumber).expect(409);

      expect(res.body).toMatchObject({
        message: `Izvod ${copy.inventoryNumber} ni izposojen`,
      });
      expect(await reservation(ready.id)).toEqual(ready);
      expect(await copyStatus()).toBe(CopyStatus.RESERVED);
    });

    it('AC4: drugo vračilo istega izvoda zavrne s 409 in zamudnine ne spremeni', async () => {
      const loan = await lend();
      await send(copy.inventoryNumber).expect(200);
      const afterFirst = await loanById(loan.id);

      const res = await send(copy.inventoryNumber).expect(409);

      expect(res.body).toMatchObject({
        message: `Izvod ${copy.inventoryNumber} ni izposojen`,
      });
      expect(await loanById(loan.id)).toEqual(afterFirst);
    });

    it('AC5: če dodelitev rezervaciji spodleti, ostane izposoja odprta in rezervacija čakajoča', async () => {
      const loan = await lend();
      const waiting = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');
      const queue = app.get(ReservationQueueService);
      const assign = queue.assignNextOrRelease.bind(queue);
      // napaka po zaprtju izposoje in dodelitvi, pred potrditvijo transakcije
      const failing = jest
        .spyOn(queue, 'assignNextOrRelease')
        .mockImplementationOnce(async (...args) => {
          await assign(...args);
          throw new Error('Dodelitev rezervacije ni uspela');
        });
      const log = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      try {
        await send(copy.inventoryNumber).expect(500);
        expect(failing).toHaveBeenCalledTimes(1);
      } finally {
        failing.mockRestore();
        log.mockRestore();
      }

      expect(await loanById(loan.id)).toEqual(loan);
      expect(await reservation(waiting.id)).toEqual(waiting);
      expect(await copyStatus()).toBe(CopyStatus.ON_LOAN);

      // ponovljeno vračilo uspe, ker se ni nič shranilo na pol
      const retry = await send(copy.inventoryNumber).expect(200);
      expect(retry.body).toMatchObject({
        reservedFor: { reservationId: waiting.id },
      });
    });

    it('sočasno vračilo dveh izvodov istega naslova: vsak dobi drugo čakajočo rezervacijo', async () => {
      await lend(copy);
      await lend(sibling, '2026-10-07', (await createMember(prisma)).id);
      const first = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');
      const second = await reserve('Petra', 'Zajc', '2026-10-05T10:00:00Z');

      const results = await Promise.all([
        send(copy.inventoryNumber),
        send(sibling.inventoryNumber),
      ]);

      expect(results.map((r) => r.status)).toEqual([200, 200]);
      const assigned = results.map(
        (r) => (r.body as ReturnResult).reservedFor?.reservationId,
      );
      expect(assigned.sort()).toEqual([first.id, second.id].sort());

      const ready = await prisma.reservation.findMany({
        where: { status: ReservationStatus.READY },
      });
      expect(ready).toHaveLength(2);
      expect(ready.map((r) => r.copyId).sort()).toEqual(
        [copy.id, sibling.id].sort(),
      );
      expect(await copyStatus(copy.id)).toBe(CopyStatus.RESERVED);
      expect(await copyStatus(sibling.id)).toBe(CopyStatus.RESERVED);
    });

    it('sočasno vračilo dveh izvodov z eno čakajočo rezervacijo: en izvod je rezerviran, drugi prost', async () => {
      await lend(copy);
      await lend(sibling, '2026-10-07', (await createMember(prisma)).id);
      const waiting = await reserve('Luka', 'Zupan', '2026-10-03T10:00:00Z');

      const results = await Promise.all([
        send(copy.inventoryNumber),
        send(sibling.inventoryNumber),
      ]);

      expect(results.map((r) => r.status)).toEqual([200, 200]);
      expect(
        results.map((r) => (r.body as ReturnResult).copyStatus).sort(),
      ).toEqual([CopyStatus.AVAILABLE, CopyStatus.RESERVED]);
      const { copyId } = await reservation(waiting.id);
      expect([copy.id, sibling.id]).toContain(copyId);
      expect(await copyStatus(copyId!)).toBe(CopyStatus.RESERVED);
    });

    it('sočasno vračilo istega izvoda: uspe samo eno', async () => {
      const loan = await lend();

      const results = await Promise.all([
        send(copy.inventoryNumber),
        send(copy.inventoryNumber),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await loanById(loan.id)).toMatchObject({
        status: LoanStatus.RETURNED,
      });
    });

    it('za neobstoječ izvod vrne 404 »Izvod … ne obstaja.«, brez inventarne številke 400', async () => {
      const missing = await send('INV-999999').expect(404);
      expect(missing.body).toMatchObject({
        message: 'Izvod INV-999999 ne obstaja.',
      });

      const empty = await http()
        .post('/loans/return')
        .set('Authorization', `Bearer ${tokens.LIBRARIAN}`)
        .send({})
        .expect(400);
      expect(empty.body).toMatchObject({
        errors: { inventoryNumber: 'Vnesi inventarno številko' },
      });
    });

    it('bralec dobi 404 »Ta stran ne obstaja«, brez prijave 401, administrator lahko vrne', async () => {
      const loan = await lend();

      const reader = await send(copy.inventoryNumber, Role.READER).expect(404);
      expect(reader.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      await http()
        .post('/loans/return')
        .send({ inventoryNumber: copy.inventoryNumber })
        .expect(401);
      expect(await loanById(loan.id)).toMatchObject({
        status: LoanStatus.ACTIVE,
      });

      await send(copy.inventoryNumber, Role.ADMIN).expect(200);
    });
  });
});
