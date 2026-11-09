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
  Prisma,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
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

interface MyReservation {
  id: string;
  status: ReservationStatus;
  position: number | null;
  readyUntil: string | null;
}

interface Reader {
  member: Member;
  token: string;
}

jest.setTimeout(30_000);

describe('US-05 Rezervacija in čakalna vrsta', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let librarian: Member;
  let tokens: Record<Role, string>;
  let reader: Reader;
  // naslov z dvema izposojenima izvodoma, brez prostega izvoda
  let bookId: string;
  let copies: Copy[];

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
      max_active_reservations: '3',
      pickup_days: '3',
    });
    librarian = await createUser(prisma, Role.LIBRARIAN);
    const admin = await createUser(prisma, Role.ADMIN);
    reader = await newReader('Maja', 'Kovač');
    tokens = {
      LIBRARIAN: await login(app, librarian.email),
      ADMIN: await login(app, admin.email),
      READER: reader.token,
    };
    ({ bookId, copies } = await unavailableBook());
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

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

  async function unavailableBook(
    statuses: CopyStatus[] = [CopyStatus.ON_LOAN],
  ) {
    const book = await createBookWithCopies(prisma, 2);
    for (const [i, copy] of book.copies.entries()) {
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: statuses[i] ?? CopyStatus.ON_LOAN },
      });
    }
    return { bookId: book.id, copies: book.copies };
  }

  const reserve = (target = bookId, token = reader.token) =>
    http()
      .post('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: target });

  const cancel = (id: string, token = reader.token) =>
    http()
      .delete(`/reservations/${id}`)
      .set('Authorization', `Bearer ${token}`);

  const myReservation = async (token = reader.token, target = bookId) => {
    const res = await http()
      .get(`/books/${target}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (res.body as { myReservation: MyReservation | null }).myReservation;
  };

  const addReservation = (
    memberId: string,
    status: ReservationStatus = ReservationStatus.WAITING,
    data: Partial<Prisma.ReservationUncheckedCreateInput> = {},
  ) =>
    prisma.reservation.create({
      data: { memberId, bookId, status, ...data },
    });

  const reservationById = (id: string) =>
    prisma.reservation.findUniqueOrThrow({ where: { id } });
  const copyStatus = async (id: string) =>
    (await prisma.copy.findUniqueOrThrow({ where: { id } })).status;
  const activeOf = (memberId: string) =>
    prisma.reservation.count({
      where: {
        memberId,
        status: { in: [ReservationStatus.WAITING, ReservationStatus.READY] },
      },
    });

  describe('rezervacija (POST /reservations)', () => {
    it('AC1: naslov brez prostega izvoda rezervira in bralca uvrsti v vrsto', async () => {
      const res = await reserve().expect(201);

      expect(res.body).toEqual({
        id: expect.any(String) as string,
        bookId,
        status: ReservationStatus.WAITING,
        position: 1,
        readyUntil: null,
        createdAt: expect.any(String) as string,
      });
      const { id } = res.body as MyReservation;
      expect(await reservationById(id)).toMatchObject({
        memberId: reader.member.id,
        bookId,
        status: ReservationStatus.WAITING,
        copyId: null,
        readyUntil: null,
      });
    });

    it('AC1: naslova s prostim izvodom ne rezervira in ničesar ne zapiše', async () => {
      await prisma.copy.update({
        where: { id: copies[1].id },
        data: { status: CopyStatus.AVAILABLE },
      });

      const res = await reserve().expect(409);

      expect(res.body).toMatchObject({
        message: 'Naslov ima prost izvod, zato ga ni mogoče rezervirati.',
      });
      expect(await prisma.reservation.count()).toBe(0);
    });

    it('AC1: izvod, ki je rezerviran, izposojen ali izgubljen, ni prost', async () => {
      const book = await unavailableBook([
        CopyStatus.RESERVED,
        CopyStatus.LOST,
      ]);

      await reserve(book.bookId).expect(201);
      await reserve().expect(201);
    });

    it('AC2: položaj v vrsti je določen po času rezervacije', async () => {
      const others = [
        await newReader('Luka', 'Zupan'),
        await newReader('Tomaž', 'Mlakar'),
      ];

      const positions = [];
      for (const { token } of [reader, ...others]) {
        const res = await reserve(bookId, token).expect(201);
        positions.push((res.body as MyReservation).position);
      }

      expect(positions).toEqual([1, 2, 3]);
      const shown = [];
      for (const { token } of [reader, ...others]) {
        shown.push((await myReservation(token))?.position);
      }
      expect(shown).toEqual([1, 2, 3]);
    });

    it('AC2: položaj šteje samo čakajoče rezervacije istega naslova pred bralcem', async () => {
      const before = new Date('2026-10-01T08:00:00Z');
      const after = new Date('2026-10-03T08:00:00Z');
      const other = await unavailableBook();
      for (const [status, createdAt, target] of [
        [ReservationStatus.WAITING, before, bookId],
        [ReservationStatus.WAITING, before, bookId],
        [ReservationStatus.READY, before, bookId],
        [ReservationStatus.CANCELLED, before, bookId],
        [ReservationStatus.FULFILLED, before, bookId],
        [ReservationStatus.EXPIRED, before, bookId],
        [ReservationStatus.WAITING, before, other.bookId],
        [ReservationStatus.WAITING, after, bookId],
      ] as const) {
        const member = await createMember(prisma);
        await addReservation(member.id, status, {
          createdAt,
          bookId: target,
        });
      }
      const mine = await addReservation(
        reader.member.id,
        ReservationStatus.WAITING,
        { createdAt: new Date('2026-10-02T08:00:00Z') },
      );

      expect(await myReservation()).toEqual({
        id: mine.id,
        status: ReservationStatus.WAITING,
        position: 3,
        readyUntil: null,
      });
    });

    it('AC2: pri enakem času rezervacije odloči id', async () => {
      const createdAt = new Date('2026-10-02T08:00:00Z');
      const other = await addReservation(
        (await createMember(prisma)).id,
        ReservationStatus.WAITING,
        { createdAt },
      );
      const mine = await addReservation(
        reader.member.id,
        ReservationStatus.WAITING,
        { createdAt },
      );

      expect((await myReservation())?.position).toBe(
        other.id < mine.id ? 2 : 1,
      );
    });

    it('stran knjige: rezervacija Na voljo ima rok prevzema brez položaja, brez aktivne rezervacije je myReservation null', async () => {
      expect(await myReservation()).toBeNull();

      const cancelled = await addReservation(
        reader.member.id,
        ReservationStatus.CANCELLED,
      );
      expect(await myReservation()).toBeNull();

      await prisma.copy.update({
        where: { id: copies[0].id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await addReservation(
        reader.member.id,
        ReservationStatus.READY,
        { copyId: copies[0].id, readyUntil: toDbDate('2026-10-14') },
      );
      expect(await myReservation()).toEqual({
        id: ready.id,
        status: ReservationStatus.READY,
        position: null,
        readyUntil: '2026-10-14',
      });
      expect(ready.id).not.toBe(cancelled.id);

      // tuja rezervacija se ne prikaže
      expect(await myReservation(tokens.LIBRARIAN)).toBeNull();
    });

    it('AC2: zadetki v katalogu vsebujejo rezervacijo bralca s položajem', async () => {
      const ready = await unavailableBook([CopyStatus.RESERVED]);
      const free = await createBookWithCopies(prisma, 1);
      await addReservation((await createMember(prisma)).id);
      const waiting = await reserve().expect(201);
      const readyReservation = await addReservation(
        reader.member.id,
        ReservationStatus.READY,
        {
          bookId: ready.bookId,
          copyId: ready.copies[0].id,
          readyUntil: toDbDate('2026-10-14'),
        },
      );

      const list = async (token: string) => {
        const res = await http()
          .get('/books')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const items = (
          res.body as {
            items: { id: string; myReservation: MyReservation | null }[];
          }
        ).items;
        return new Map(items.map((item) => [item.id, item.myReservation]));
      };

      const mine = await list(reader.token);
      expect(mine.get(bookId)).toEqual({
        id: (waiting.body as MyReservation).id,
        status: ReservationStatus.WAITING,
        position: 2,
        readyUntil: null,
      });
      expect(mine.get(ready.bookId)).toEqual({
        id: readyReservation.id,
        status: ReservationStatus.READY,
        position: null,
        readyUntil: '2026-10-14',
      });
      expect(mine.get(free.id)).toBeNull();

      // drug bralec vidi samo svoje rezervacije
      const other = await newReader('Luka', 'Zupan');
      expect([...(await list(other.token)).values()]).toEqual([
        null,
        null,
        null,
      ]);
    });

    it('stran knjige: rok za prevzem se bere iz nastavitve pickup_days', async () => {
      const days = async () => {
        const res = await http()
          .get(`/books/${bookId}`)
          .set('Authorization', `Bearer ${reader.token}`)
          .expect(200);
        return (res.body as { pickupDays: number }).pickupDays;
      };

      expect(await days()).toBe(3);
      await setSettings(app, { pickup_days: '5' });
      expect(await days()).toBe(5);
    });

    it('AC3: četrto aktivno rezervacijo zavrne z "Imaš že 3 aktivne rezervacije" in je ne ustvari', async () => {
      for (const status of [
        ReservationStatus.WAITING,
        ReservationStatus.WAITING,
        ReservationStatus.READY,
      ]) {
        const other = await unavailableBook();
        await addReservation(reader.member.id, status, {
          bookId: other.bookId,
        });
      }

      const res = await reserve().expect(409);

      expect(res.body).toMatchObject({
        message: 'Imaš že 3 aktivne rezervacije',
      });
      expect(await activeOf(reader.member.id)).toBe(3);
      expect(await prisma.reservation.count({ where: { bookId } })).toBe(0);
    });

    it('AC3: preklicane, izpolnjene in potekle rezervacije se ne štejejo', async () => {
      for (const status of [
        ReservationStatus.WAITING,
        ReservationStatus.WAITING,
        ReservationStatus.CANCELLED,
        ReservationStatus.FULFILLED,
        ReservationStatus.EXPIRED,
      ]) {
        const other = await unavailableBook();
        await addReservation(reader.member.id, status, {
          bookId: other.bookId,
        });
      }

      await reserve().expect(201);

      expect(await activeOf(reader.member.id)).toBe(3);
    });

    it('AC3: meja se bere iz nastavitve max_active_reservations', async () => {
      await setSettings(app, { max_active_reservations: '2' });
      for (let i = 0; i < 2; i++) {
        const other = await unavailableBook();
        await addReservation(reader.member.id, ReservationStatus.WAITING, {
          bookId: other.bookId,
        });
      }

      const res = await reserve().expect(409);

      expect(res.body).toMatchObject({
        message: 'Imaš že 2 aktivni rezervaciji',
      });
    });

    it('AC4: istega naslova ne rezervira dvakrat', async () => {
      await reserve().expect(201);

      const again = await reserve().expect(409);
      expect(again.body).toMatchObject({
        message: 'Ta naslov že imaš rezerviran.',
      });

      // tudi ko je rezervacija že Na voljo
      await prisma.reservation.updateMany({
        data: { status: ReservationStatus.READY, copyId: copies[0].id },
      });
      const ready = await reserve().expect(409);
      expect(ready.body).toMatchObject({
        message: 'Ta naslov že imaš rezerviran.',
      });
      expect(await prisma.reservation.count()).toBe(1);
    });

    it('AC4: naslova, ki ga ima bralec izposojenega, ne rezervira', async () => {
      const loan = await createLoan(prisma, {
        memberId: reader.member.id,
        librarianId: librarian.id,
        copyId: copies[0].id,
        status: LoanStatus.ACTIVE,
        dueDate: '2026-10-20',
      });

      const res = await reserve().expect(409);

      expect(res.body).toMatchObject({
        message: 'Ta naslov že imaš izposojen.',
      });
      expect(await prisma.reservation.count()).toBe(0);

      // vrnjena izposoja ne ovira rezervacije
      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.RETURNED,
          returnedOn: toDbDate('2026-10-10'),
        },
      });
      await reserve().expect(201);
    });

    it('AC4: po preklicu lahko isti naslov rezervira znova, na konec vrste', async () => {
      const first = await reserve().expect(201);
      const other = await newReader('Luka', 'Zupan');
      await reserve(bookId, other.token).expect(201);

      await cancel((first.body as MyReservation).id).expect(204);
      const again = await reserve().expect(201);

      expect(again.body).toMatchObject({ position: 2 });
      expect(
        await prisma.reservation.count({
          where: { memberId: reader.member.id },
        }),
      ).toBe(2);
    });

    it('sočasni rezervaciji istega naslova: uspe samo ena', async () => {
      const results = await Promise.all([reserve(), reserve()]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body).toMatchObject({
        message: 'Ta naslov že imaš rezerviran.',
      });
      expect(await activeOf(reader.member.id)).toBe(1);
    });

    it('sočasni rezervaciji pri 2 od 3 aktivnih: uspe samo ena', async () => {
      for (let i = 0; i < 2; i++) {
        const other = await unavailableBook();
        await addReservation(reader.member.id, ReservationStatus.WAITING, {
          bookId: other.bookId,
        });
      }
      const second = await unavailableBook();

      const results = await Promise.all([reserve(), reserve(second.bookId)]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body).toMatchObject({
        message: 'Imaš že 3 aktivne rezervacije',
      });
      expect(await activeOf(reader.member.id)).toBe(3);
    });

    it('sočasni rezervacija in vračilo zadnjega izposojenega izvoda: rezervacija ne čaka ob prostem izvodu', async () => {
      const borrower = await createMember(prisma);
      for (let i = 0; i < 5; i++) {
        await prisma.reservation.deleteMany();
        await prisma.loan.deleteMany();
        const {
          bookId: target,
          copies: [copy, lost],
        } = await unavailableBook();
        await prisma.copy.update({
          where: { id: lost.id },
          data: { status: CopyStatus.LOST },
        });
        await createLoan(prisma, {
          memberId: borrower.id,
          librarianId: librarian.id,
          copyId: copy.id,
          status: LoanStatus.ACTIVE,
          dueDate: '2026-10-20',
        });

        const [reserved, returned] = await Promise.all([
          reserve(target),
          http()
            .post('/loans/return')
            .set('Authorization', `Bearer ${tokens.LIBRARIAN}`)
            .send({ inventoryNumber: copy.inventoryNumber }),
        ]);

        expect(returned.status).toBe(200);
        const mine = await prisma.reservation.findFirst({
          where: { memberId: reader.member.id, bookId: target },
        });
        if (reserved.status === 201) {
          // rezervacija je bila prva, vračilo ji je dodelilo izvod
          expect(mine).toMatchObject({
            status: ReservationStatus.READY,
            copyId: copy.id,
          });
          expect(await copyStatus(copy.id)).toBe(CopyStatus.RESERVED);
        } else {
          expect(reserved.body).toMatchObject({
            message: 'Naslov ima prost izvod, zato ga ni mogoče rezervirati.',
          });
          expect(mine).toBeNull();
          expect(await copyStatus(copy.id)).toBe(CopyStatus.AVAILABLE);
        }
      }
    });

    it('blokiran bralec ne more rezervirati', async () => {
      await prisma.member.update({
        where: { id: reader.member.id },
        data: { isBlocked: true },
      });

      const res = await reserve().expect(409);

      expect(res.body).toMatchObject({
        message: 'Tvoj račun je blokiran. Obrni se na knjižnico.',
      });
      expect(await prisma.reservation.count()).toBe(0);
    });

    it('brez veljavne knjige vrne 400, za neobstoječo knjigo 404', async () => {
      for (const body of [{}, { bookId: 'ni-uuid' }]) {
        const res = await http()
          .post('/reservations')
          .set('Authorization', `Bearer ${reader.token}`)
          .send(body)
          .expect(400);
        expect(res.body).toMatchObject({
          errors: { bookId: 'Izberi knjigo' },
        });
      }

      const missing = await reserve(randomUUID()).expect(404);
      expect(missing.body).toMatchObject({ message: 'Knjiga ne obstaja.' });
    });
  });

  describe('preklic (DELETE /reservations/:id)', () => {
    it('AC5: preklic čakajoče rezervacije ohrani zapis, bralcem za njim se položaj zmanjša za 1', async () => {
      const queue = [
        await newReader('Ana', 'Prva'),
        reader,
        await newReader('Luka', 'Zupan'),
        await newReader('Tomaž', 'Mlakar'),
      ];
      const ids: string[] = [];
      for (const { token } of queue) {
        ids.push(((await reserve(bookId, token)).body as MyReservation).id);
      }
      const positions = async () => {
        const result = [];
        for (const { token } of queue) {
          result.push((await myReservation(token))?.position ?? null);
        }
        return result;
      };
      expect(await positions()).toEqual([1, 2, 3, 4]);

      await cancel(ids[1]).expect(204);

      expect(await reservationById(ids[1])).toMatchObject({
        status: ReservationStatus.CANCELLED,
        memberId: reader.member.id,
      });
      expect(await positions()).toEqual([1, null, 2, 3]);
    });

    it('AC5: preklic rezervacije Na voljo: izvod dobi naslednji v vrsti', async () => {
      const [copy] = copies;
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await addReservation(
        reader.member.id,
        ReservationStatus.READY,
        {
          copyId: copy.id,
          readyUntil: toDbDate('2026-10-13'),
          createdAt: new Date('2026-09-30T08:00:00Z'),
        },
      );
      const next = await newReader('Luka', 'Zupan');
      const last = await newReader('Tomaž', 'Mlakar');
      await reserve(bookId, next.token).expect(201);
      await reserve(bookId, last.token).expect(201);
      expect((await myReservation(last.token))?.position).toBe(2);

      await cancel(ready.id).expect(204);

      expect(await reservationById(ready.id)).toMatchObject({
        status: ReservationStatus.CANCELLED,
      });
      expect(await myReservation(next.token)).toMatchObject({
        status: ReservationStatus.READY,
        position: null,
        readyUntil: '2026-10-15',
      });
      expect(
        await prisma.reservation.findFirst({
          where: { memberId: next.member.id },
        }),
      ).toMatchObject({ copyId: copy.id });
      expect(await copyStatus(copy.id)).toBe(CopyStatus.RESERVED);
      expect((await myReservation(last.token))?.position).toBe(1);
    });

    it('AC5: brez čakajočih je izvod po preklicu rezervacije Na voljo prost', async () => {
      const [copy] = copies;
      await prisma.copy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.RESERVED },
      });
      const ready = await addReservation(
        reader.member.id,
        ReservationStatus.READY,
        { copyId: copy.id, readyUntil: toDbDate('2026-10-13') },
      );

      await cancel(ready.id).expect(204);

      expect(await copyStatus(copy.id)).toBe(CopyStatus.AVAILABLE);
    });

    it('tuje rezervacije ne more preklicati (403) in ta ostane nespremenjena', async () => {
      const other = await newReader('Luka', 'Zupan');
      const res = await reserve(bookId, other.token).expect(201);
      const { id } = res.body as MyReservation;

      const denied = await cancel(id).expect(403);

      expect(denied.body).toMatchObject({
        message: 'Prekličeš lahko samo svojo rezervacijo.',
      });
      expect(await reservationById(id)).toMatchObject({
        status: ReservationStatus.WAITING,
      });
    });

    it('rezervacije, ki ni več aktivna, ni mogoče preklicati', async () => {
      for (const status of [
        ReservationStatus.CANCELLED,
        ReservationStatus.FULFILLED,
        ReservationStatus.EXPIRED,
      ]) {
        const reservation = await addReservation(reader.member.id, status);

        const res = await cancel(reservation.id).expect(409);

        expect(res.body).toMatchObject({
          message: 'Rezervacija ni več aktivna, zato je ni mogoče preklicati.',
        });
        expect(await reservationById(reservation.id)).toMatchObject({
          status,
        });
      }
    });

    it('za neobstoječo rezervacijo vrne 404', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await cancel(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Rezervacija ne obstaja.' });
      }
    });
  });

  describe('dostop', () => {
    it('knjižničar in administrator dobita 404 "Ta stran ne obstaja", brez prijave 401', async () => {
      const own = await addReservation(reader.member.id);

      for (const role of [Role.LIBRARIAN, Role.ADMIN]) {
        const created = await reserve(bookId, tokens[role]).expect(404);
        expect(created.body).toMatchObject({ message: 'Ta stran ne obstaja' });
        const cancelled = await cancel(own.id, tokens[role]).expect(404);
        expect(cancelled.body).toMatchObject({
          message: 'Ta stran ne obstaja',
        });
      }
      await http().post('/reservations').send({ bookId }).expect(401);
      await http().delete(`/reservations/${own.id}`).expect(401);

      expect(await reservationById(own.id)).toMatchObject({
        status: ReservationStatus.WAITING,
      });
      expect(await prisma.reservation.count()).toBe(1);
    });
  });
});
