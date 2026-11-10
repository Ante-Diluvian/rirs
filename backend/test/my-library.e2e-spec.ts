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
  CopyStatus,
  LoanStatus,
  Member,
  Prisma,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  TODAY,
  createBookWithCopies,
  createLoan,
  createUser,
  login,
  resetDatabase,
  setSettings,
} from './factories';

interface MyLoan {
  id: string;
  dueDate: string;
  isOverdue: boolean;
  dueSoon: boolean;
}

interface MyReservationItem {
  id: string;
  status: ReservationStatus;
}

interface Reader {
  member: Member;
  token: string;
}

jest.setTimeout(30_000);

describe('US-06 Moja knjižnica', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let librarian: Member;
  let tokens: Record<Role, string>;
  let maja: Reader;
  let janez: Reader;

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
    librarian = await createUser(prisma, Role.LIBRARIAN);
    const admin = await createUser(prisma, Role.ADMIN);
    maja = await newReader('Maja', 'Kovač');
    janez = await newReader('Janez', 'Novak');
    tokens = {
      LIBRARIAN: await login(app, librarian.email),
      ADMIN: await login(app, admin.email),
      READER: maja.token,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  const get = (path: string, token = maja.token) =>
    http().get(path).set('Authorization', `Bearer ${token}`);

  async function newReader(
    firstName: string,
    lastName: string,
  ): Promise<Reader> {
    const member = await createUser(prisma, Role.READER, {
      firstName,
      lastName,
    });
    return { member, token: await login(app, member.email) };
  }

  async function newBook(title: string) {
    const book = await createBookWithCopies(prisma, 1);
    await prisma.book.update({ where: { id: book.id }, data: { title } });
    return {
      id: book.id,
      copyId: book.copies[0].id,
      inventoryNumber: book.copies[0].inventoryNumber,
      author: {
        id: book.authors[0].authorId,
        firstName: 'George',
        lastName: 'Orwell',
      },
    };
  }

  async function addLoan(
    memberId: string,
    data: {
      dueDate?: string;
      status?: LoanStatus;
      fineAmount?: string;
      finePaid?: boolean;
      fineWaived?: boolean;
    } = {},
    title = 'Alamut',
  ) {
    const book = await newBook(title);
    const loan = await createLoan(prisma, {
      memberId,
      librarianId: librarian.id,
      copyId: book.copyId,
      status: LoanStatus.ACTIVE,
      ...data,
    });
    return { loan, book };
  }

  // vrnjena izposoja z neporavnano, plačano ali odpisano zamudnino
  const addReturnedFine = (
    memberId: string,
    fineAmount: string,
    data: { finePaid?: boolean; fineWaived?: boolean } = {},
  ) => addLoan(memberId, { status: LoanStatus.RETURNED, fineAmount, ...data });

  const addReservation = (
    memberId: string,
    bookId: string,
    status: ReservationStatus = ReservationStatus.WAITING,
    data: Partial<Prisma.ReservationUncheckedCreateInput> = {},
  ) =>
    prisma.reservation.create({
      data: { memberId, bookId, status, ...data },
    });

  // izvod je izposojen, da ga lahko knjižničar na pultu vrne
  async function lendCopy(memberId: string, dueDate: string) {
    const { loan, book } = await addLoan(memberId, { dueDate });
    await prisma.copy.update({
      where: { id: book.copyId },
      data: { status: CopyStatus.ON_LOAN },
    });
    return { loan, book };
  }

  const returnCopy = (inventoryNumber: string) =>
    http()
      .post('/loans/return')
      .set('Authorization', `Bearer ${tokens.LIBRARIAN}`)
      .send({ inventoryNumber });

  const fineRule = async (memberId: string, inventoryNumber: string) => {
    const res = await http()
      .post('/loans/check')
      .set('Authorization', `Bearer ${tokens.LIBRARIAN}`)
      .send({ memberId, inventoryNumber })
      .expect(200);
    const { checks } = res.body as {
      checks: { rule: string; passed: boolean; message: string }[];
    };
    return checks.find((check) => check.rule === 'FINE_LIMIT');
  };

  const myLoans = async (token = maja.token) =>
    (await get('/me/loans', token).expect(200)).body as MyLoan[];

  const myReservations = async (token = maja.token) =>
    (await get('/me/reservations', token).expect(200))
      .body as MyReservationItem[];

  const mySummary = async (token = maja.token) =>
    (await get('/me/summary', token).expect(200)).body as Record<
      string,
      unknown
    >;

  describe('izposoje (GET /me/loans)', () => {
    it('AC1: vrne aktivne izposoje z naslovom, datumom izposoje, rokom in preostalimi dnevi', async () => {
      const { loan, book } = await addLoan(
        maja.member.id,
        { dueDate: '2026-10-26' },
        'Na klancu',
      );
      await addReturnedFine(maja.member.id, '0.00');

      expect(await myLoans()).toEqual([
        {
          id: loan.id,
          book: { id: book.id, title: 'Na klancu', authors: [book.author] },
          loanedOn: '2026-10-05',
          dueDate: '2026-10-26',
          daysLeft: 14,
          isOverdue: false,
          overdueDays: 0,
          fine: '0.00',
          dueSoon: false,
        },
      ]);
    });

    it('AC1: zamujena izposoja je označena in ima trenutno zamudnino', async () => {
      await addLoan(maja.member.id, { dueDate: '2026-10-07' });

      expect(await myLoans()).toEqual([
        expect.objectContaining({
          dueDate: '2026-10-07',
          daysLeft: 0,
          isOverdue: true,
          overdueDays: 5,
          fine: '0.50',
          dueSoon: false,
        }),
      ]);
    });

    it('AC1: zamudnina na dan je iz nastavitve fine_per_day', async () => {
      await setSettings(app, { fine_per_day: '0.25' });
      await addLoan(maja.member.id, { dueDate: '2026-10-07' });

      expect(await myLoans()).toEqual([
        expect.objectContaining({ overdueDays: 5, fine: '1.25' }),
      ]);
    });

    it('AC1: izposoje so urejene po roku vrnitve, bralec brez izposoj dobi prazen seznam', async () => {
      expect(await myLoans()).toEqual([]);

      for (const dueDate of ['2026-10-26', '2026-10-07', '2026-10-14']) {
        await addLoan(maja.member.id, { dueDate });
      }

      expect((await myLoans()).map((loan) => loan.dueDate)).toEqual([
        '2026-10-07',
        '2026-10-14',
        '2026-10-26',
      ]);
    });

    it('AC2: "Rok kmalu poteče" velja za rok danes do čez 3 dni, ne za zamujene', async () => {
      for (const dueDate of [
        '2026-10-11',
        '2026-10-12',
        '2026-10-15',
        '2026-10-16',
      ]) {
        await addLoan(maja.member.id, { dueDate });
      }

      expect(
        (await myLoans()).map(({ dueDate, dueSoon, isOverdue }) => ({
          dueDate,
          dueSoon,
          isOverdue,
        })),
      ).toEqual([
        { dueDate: '2026-10-11', dueSoon: false, isOverdue: true },
        { dueDate: '2026-10-12', dueSoon: true, isOverdue: false },
        { dueDate: '2026-10-15', dueSoon: true, isOverdue: false },
        { dueDate: '2026-10-16', dueSoon: false, isOverdue: false },
      ]);
    });
  });

  describe('rezervacije (GET /me/reservations)', () => {
    it('AC3: čakajoča ima položaj v vrsti, rezervacija na voljo pa rok prevzema', async () => {
      const waitingBook = await newBook('1984');
      const readyBook = await newBook('Visoška kronika');
      await addReservation(janez.member.id, waitingBook.id, undefined, {
        createdAt: new Date('2026-10-01T08:00:00Z'),
      });
      const waiting = await addReservation(
        maja.member.id,
        waitingBook.id,
        undefined,
        { createdAt: new Date('2026-10-12T08:00:00Z') },
      );
      const ready = await addReservation(
        maja.member.id,
        readyBook.id,
        ReservationStatus.READY,
        {
          copyId: readyBook.copyId,
          readyUntil: toDbDate('2026-10-14'),
          createdAt: new Date('2026-09-28T09:00:00Z'),
        },
      );

      expect(await myReservations()).toEqual([
        {
          id: waiting.id,
          status: ReservationStatus.WAITING,
          position: 2,
          readyUntil: null,
          book: {
            id: waitingBook.id,
            title: '1984',
            authors: [waitingBook.author],
          },
          reservedOn: '2026-10-12',
        },
        {
          id: ready.id,
          status: ReservationStatus.READY,
          position: null,
          readyUntil: '2026-10-14',
          book: {
            id: readyBook.id,
            title: 'Visoška kronika',
            authors: [readyBook.author],
          },
          reservedOn: '2026-09-28',
        },
      ]);
    });

    it('AC3: preklicane, izposojene in potekle rezervacije niso prikazane', async () => {
      const book = await newBook('1984');
      for (const status of [
        ReservationStatus.CANCELLED,
        ReservationStatus.FULFILLED,
        ReservationStatus.EXPIRED,
      ]) {
        await addReservation(maja.member.id, book.id, status);
      }
      expect(await myReservations()).toEqual([]);

      const waiting = await addReservation(maja.member.id, book.id);

      expect(await myReservations()).toEqual([
        expect.objectContaining({ id: waiting.id, position: 1 }),
      ]);
    });

    it('AC3: dan rezervacije je koledarski dan v Ljubljani', async () => {
      const book = await newBook('1984');
      // 22.30 UTC je v Ljubljani (poletni čas) že naslednji dan
      await addReservation(maja.member.id, book.id, undefined, {
        createdAt: new Date('2026-10-11T22:30:00Z'),
      });

      expect(await myReservations()).toEqual([
        expect.objectContaining({ reservedOn: '2026-10-12' }),
      ]);
    });
  });

  describe('povzetek (GET /me/summary)', () => {
    it('AC4: vrne izposoje in rezervacije z mejami ter skupno neplačano zamudnino', async () => {
      await addLoan(maja.member.id, { dueDate: '2026-10-07' });
      await addLoan(maja.member.id, { dueDate: '2026-10-26' });
      await addReturnedFine(maja.member.id, '0.30');
      await addReturnedFine(maja.member.id, '1.00', { finePaid: true });
      await addReturnedFine(maja.member.id, '2.00', { fineWaived: true });
      const book = await newBook('1984');
      await addReservation(maja.member.id, book.id);
      await addReservation(
        maja.member.id,
        book.id,
        ReservationStatus.CANCELLED,
      );
      const other = await newBook('Visoška kronika');
      await addReservation(maja.member.id, other.id, ReservationStatus.READY, {
        copyId: other.copyId,
        readyUntil: toDbDate('2026-10-14'),
      });

      expect(await mySummary()).toEqual({
        today: TODAY,
        activeLoans: 2,
        maxActiveLoans: 5,
        activeReservations: 2,
        maxActiveReservations: 3,
        // 0,50 € sprotne zamudnine in 0,30 € neporavnane
        unpaidFine: '0.80',
        fineLimit: '5.00',
        borrowingBlocked: false,
      });
    });

    it('AC4: izposoja je onemogočena šele, ko je zamudnina nad 5,00 €', async () => {
      await addReturnedFine(maja.member.id, '5.00');
      expect(await mySummary()).toMatchObject({
        unpaidFine: '5.00',
        borrowingBlocked: false,
      });

      await addLoan(maja.member.id, { dueDate: '2026-10-11' });

      expect(await mySummary()).toMatchObject({
        unpaidFine: '5.10',
        borrowingBlocked: true,
      });
    });

    it('AC4: meje in zamudnina sledijo nastavitvam', async () => {
      await setSettings(app, {
        max_active_loans: '4',
        max_active_reservations: '2',
        fine_per_day: '0.20',
        fine_limit: '1.00',
      });
      await addLoan(maja.member.id, { dueDate: '2026-10-06' });

      expect(await mySummary()).toMatchObject({
        maxActiveLoans: 4,
        maxActiveReservations: 2,
        unpaidFine: '1.20',
        fineLimit: '1.00',
        borrowingBlocked: true,
      });
    });
  });

  describe('AC5: samo lastni podatki', () => {
    it('AC5: bralec vidi samo svoje izposoje, rezervacije in zamudnine', async () => {
      const { loan } = await addLoan(janez.member.id, {
        dueDate: '2026-10-07',
      });
      await addReturnedFine(janez.member.id, '3.00');
      const book = await newBook('1984');
      const reservation = await addReservation(janez.member.id, book.id);

      expect(await myLoans()).toEqual([]);
      expect(await myReservations()).toEqual([]);
      expect(await mySummary()).toMatchObject({
        activeLoans: 0,
        activeReservations: 0,
        unpaidFine: '0.00',
      });

      // ID drugega člana v poizvedbi ne vpliva na rezultat
      const res = await get(`/me/loans?memberId=${janez.member.id}`).expect(
        200,
      );
      expect(res.body).toEqual([]);

      expect(await myLoans(janez.token)).toEqual([
        expect.objectContaining({ id: loan.id }),
      ]);
      expect(await myReservations(janez.token)).toEqual([
        expect.objectContaining({ id: reservation.id }),
      ]);
      expect(await mySummary(janez.token)).toMatchObject({
        unpaidFine: '3.50',
      });
    });

    it('AC5: zahteva za povzetek drugega člana vrne 403', async () => {
      for (const id of [janez.member.id, librarian.id, randomUUID()]) {
        const res = await get(`/members/${id}/summary`).expect(403);
        expect(res.body).toMatchObject({
          statusCode: 403,
          message: 'Vidiš lahko samo svoje podatke.',
        });
      }
    });

    it('AC5: bralec dobi povzetek svojega računa', async () => {
      const res = await get(`/members/${maja.member.id}/summary`).expect(200);

      expect(res.body).toMatchObject({
        id: maja.member.id,
        activeLoans: 0,
        unpaidFine: '0.00',
      });
    });
  });

  describe('skupaj z vračilom in izposojo na pultu', () => {
    it('AC1, AC4: po vračilu zamujene izposoje izposoja izgine, zamudnina pa ostane neplačana', async () => {
      const { book } = await lendCopy(maja.member.id, '2026-10-07');
      expect(await mySummary()).toMatchObject({
        activeLoans: 1,
        unpaidFine: '0.50',
      });

      await returnCopy(book.inventoryNumber).expect(200);

      expect(await myLoans()).toEqual([]);
      expect(await mySummary()).toMatchObject({
        activeLoans: 0,
        unpaidFine: '0.50',
      });
    });

    it('AC3: ko knjižničar vrne izvod, je čakajoča rezervacija na voljo z rokom prevzema', async () => {
      const { book } = await lendCopy(janez.member.id, '2026-10-26');
      const reservation = await addReservation(maja.member.id, book.id);
      expect(await myReservations()).toEqual([
        expect.objectContaining({
          id: reservation.id,
          status: ReservationStatus.WAITING,
          position: 1,
          readyUntil: null,
        }),
      ]);

      await returnCopy(book.inventoryNumber).expect(200);

      expect(await myReservations()).toEqual([
        expect.objectContaining({
          id: reservation.id,
          status: ReservationStatus.READY,
          position: null,
          readyUntil: '2026-10-15',
        }),
      ]);
    });

    it('AC4: opozorilo o zamudnini se ujema s pravilom izposoje na pultu', async () => {
      const free = await newBook('Na klancu');
      await addReturnedFine(maja.member.id, '5.00');

      expect(await mySummary()).toMatchObject({ borrowingBlocked: false });
      expect(
        await fineRule(maja.member.id, free.inventoryNumber),
      ).toMatchObject({ passed: true });

      await addReturnedFine(maja.member.id, '0.01');

      expect(await mySummary()).toMatchObject({
        unpaidFine: '5.01',
        borrowingBlocked: true,
      });
      expect(await fineRule(maja.member.id, free.inventoryNumber)).toEqual({
        rule: 'FINE_LIMIT',
        passed: false,
        message:
          'Član ima neplačano zamudnino 5,01 €, kar presega mejo 5,00 €.',
      });
    });
  });

  describe('dostop', () => {
    const paths = ['/me/loans', '/me/reservations', '/me/summary'];

    it('knjižničar in administrator dobita 404 "Ta stran ne obstaja"', async () => {
      for (const role of [Role.LIBRARIAN, Role.ADMIN]) {
        for (const path of paths) {
          const res = await get(path, tokens[role]).expect(404);
          expect(res.body).toMatchObject({ message: 'Ta stran ne obstaja' });
        }
      }
    });

    it('brez prijave vrne 401', async () => {
      for (const path of paths) {
        await http().get(path).expect(401);
      }
    });
  });
});
