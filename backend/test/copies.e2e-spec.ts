import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  CopyStatus,
  LoanStatus,
  Member,
  Role,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createBookWithCopies,
  createLoan,
  createUser,
  login,
  resetDatabase,
} from './factories';

interface CopyBody {
  id: string;
  inventoryNumber: string;
  status: CopyStatus;
}

jest.setTimeout(30_000);

describe('US-07 Upravljanje kataloga: izvodi', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const users: Record<string, Member> = {};
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    for (const role of [Role.READER, Role.LIBRARIAN, Role.ADMIN]) {
      users[role] = await createUser(prisma, role);
      tokens[role] = await login(app, users[role].email);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (token?: string) => (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  const http = () => request(app.getHttpServer());
  const list = (bookId: string, token = tokens.LIBRARIAN) =>
    auth(token)(http().get(`/books/${bookId}/copies`));
  const create = (bookId: string, body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().post(`/books/${bookId}/copies`).send(body));
  const update = (id: string, body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().patch(`/copies/${id}`).send(body));
  const remove = (id: string, token = tokens.LIBRARIAN) =>
    auth(token)(http().delete(`/copies/${id}`));

  const loan = (copyId: string, status: LoanStatus) =>
    createLoan(prisma, {
      memberId: users.READER.id,
      librarianId: users.LIBRARIAN.id,
      copyId,
      status,
    });
  const setStatus = (id: string, status: CopyStatus) =>
    prisma.copy.update({ where: { id }, data: { status } });
  const statusOf = async (id: string) =>
    (await prisma.copy.findUniqueOrThrow({ where: { id } })).status;

  // vsi izvodi so vsi razen izgubljenih (skill librarium-rules)
  const counts = async (bookId: string) => {
    const res = await list(bookId).expect(200);
    const copies = res.body as CopyBody[];
    return {
      total: copies.filter((c) => c.status !== CopyStatus.LOST).length,
      available: copies.filter((c) => c.status === CopyStatus.AVAILABLE).length,
    };
  };

  describe('AC2: nov izvod', () => {
    it('dobi stanje Prost, število vseh in prostih izvodov se poveča za 1', async () => {
      const book = await createBookWithCopies(prisma, 3);
      await setStatus(book.copies[1].id, CopyStatus.ON_LOAN);
      await setStatus(book.copies[2].id, CopyStatus.LOST);
      expect(await counts(book.id)).toEqual({ total: 2, available: 1 });

      const res = await create(book.id, {
        inventoryNumber: ' INV-000999 ',
        shelf: 'A-12',
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String) as string,
        bookId: book.id,
        inventoryNumber: 'INV-000999',
        status: CopyStatus.AVAILABLE,
        shelf: 'A-12',
      });
      expect(await counts(book.id)).toEqual({ total: 3, available: 2 });
    });

    it('seznam izvodov je urejen po inventarni številki', async () => {
      const book = await createBookWithCopies(prisma, 0);
      for (const inventoryNumber of ['INV-3', 'INV-1', 'INV-2']) {
        await create(book.id, { inventoryNumber }).expect(201);
      }

      const res = await list(book.id).expect(200);

      expect((res.body as CopyBody[]).map((c) => c.inventoryNumber)).toEqual([
        'INV-1',
        'INV-2',
        'INV-3',
      ]);
    });

    it('zahteva unikatno inventarno številko', async () => {
      const book = await createBookWithCopies(prisma);
      const other = await createBookWithCopies(prisma);

      const res = await create(other.id, {
        inventoryNumber: book.copies[0].inventoryNumber,
      }).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message: 'Izvod s to inventarno številko že obstaja.',
      });
      expect(await prisma.copy.count({ where: { bookId: other.id } })).toBe(1);
    });

    it('zahteva inventarno številko z največ 20 znaki', async () => {
      const book = await createBookWithCopies(prisma, 0);
      const cases: [object, string][] = [
        [{}, 'Vnesi inventarno številko'],
        [{ inventoryNumber: '   ' }, 'Vnesi inventarno številko'],
        [
          { inventoryNumber: 'I'.repeat(21) },
          'Inventarna številka je predolga, največ 20 znakov',
        ],
      ];
      for (const [body, message] of cases) {
        const res = await create(book.id, body).expect(400);
        expect(res.body).toMatchObject({
          message: 'Neveljavni podatki',
          errors: { inventoryNumber: message },
        });
      }
      expect(await prisma.copy.count()).toBe(0);
    });

    it('stanja ni mogoče izbrati ob dodajanju', async () => {
      const book = await createBookWithCopies(prisma, 0);

      await create(book.id, {
        inventoryNumber: 'INV-000999',
        status: CopyStatus.LOST,
      }).expect(400);

      expect(await prisma.copy.count()).toBe(0);
    });

    it('za neobstoječo knjigo vrne 404 »Knjiga ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        for (const res of [
          await list(id).expect(404),
          await create(id, { inventoryNumber: 'INV-000999' }).expect(404),
        ]) {
          expect(res.body).toMatchObject({ message: 'Knjiga ne obstaja.' });
        }
      }
      expect(await prisma.copy.count()).toBe(0);
    });
  });

  describe('AC3: brisanje izvoda', () => {
    it('izvoda z zgodovino izposoj ni mogoče izbrisati, sistem predlaga Izgubljen', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;
      await loan(copyId, LoanStatus.RETURNED);

      const res = await remove(copyId).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message:
          'Izvoda z zgodovino izposoj ni mogoče izbrisati. Označi ga kot izgubljenega.',
      });
      expect(await prisma.copy.count({ where: { id: copyId } })).toBe(1);

      await update(copyId, { status: CopyStatus.LOST }).expect(200);
      expect(await statusOf(copyId)).toBe(CopyStatus.LOST);
    });

    it('izposojenega izvoda ni mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;
      await setStatus(copyId, CopyStatus.ON_LOAN);
      await loan(copyId, LoanStatus.ACTIVE);

      await remove(copyId).expect(409);

      expect(await prisma.copy.count({ where: { id: copyId } })).toBe(1);
    });

    it('rezerviranega izvoda ni mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;
      await setStatus(copyId, CopyStatus.RESERVED);

      const res = await remove(copyId).expect(409);

      expect(res.body).toMatchObject({
        message: 'Rezerviranega izvoda ni mogoče izbrisati.',
      });
    });

    it('izvod brez izposoj izbriše, število izvodov knjige se zmanjša', async () => {
      const book = await createBookWithCopies(prisma, 2);

      await remove(book.copies[0].id).expect(204);

      expect(await counts(book.id)).toEqual({ total: 1, available: 1 });
      expect(await prisma.book.count({ where: { id: book.id } })).toBe(1);
    });

    it('za neobstoječ izvod vrne 404 »Izvod ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await remove(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Izvod ne obstaja.' });
      }
    });
  });

  describe('sprememba police in stanja', () => {
    it('označi izvod kot izgubljen in nato spet kot prost', async () => {
      const book = await createBookWithCopies(prisma, 2);
      const copyId = book.copies[0].id;

      const lost = await update(copyId, {
        status: CopyStatus.LOST,
        shelf: ' B-3 ',
      }).expect(200);
      expect(lost.body).toMatchObject({
        status: CopyStatus.LOST,
        shelf: 'B-3',
      });
      expect(await counts(book.id)).toEqual({ total: 1, available: 1 });

      const found = await update(copyId, {
        status: CopyStatus.AVAILABLE,
      }).expect(200);
      expect(found.body).toMatchObject({
        status: CopyStatus.AVAILABLE,
        shelf: 'B-3',
      });
      expect(await counts(book.id)).toEqual({ total: 2, available: 2 });
    });

    it('izpuščena polica ostane, prazna polica se pobriše', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;
      await update(copyId, { shelf: 'A-12' }).expect(200);

      const kept = await update(copyId, {}).expect(200);
      expect(kept.body).toMatchObject({ shelf: 'A-12' });

      const cleared = await update(copyId, { shelf: '' }).expect(200);
      expect(cleared.body).toMatchObject({ shelf: null });
    });

    it('izposojenemu ali rezerviranemu izvodu ni mogoče ročno spremeniti stanja', async () => {
      const book = await createBookWithCopies(prisma, 2);
      const [onLoan, reserved] = book.copies;
      await setStatus(onLoan.id, CopyStatus.ON_LOAN);
      await setStatus(reserved.id, CopyStatus.RESERVED);

      for (const copy of [onLoan, reserved]) {
        for (const status of [CopyStatus.AVAILABLE, CopyStatus.LOST]) {
          const res = await update(copy.id, { status }).expect(409);
          expect(res.body).toMatchObject({
            message:
              'Izposojenemu ali rezerviranemu izvodu ni mogoče ročno spremeniti stanja.',
          });
        }
      }
      expect(await statusOf(onLoan.id)).toBe(CopyStatus.ON_LOAN);
      expect(await statusOf(reserved.id)).toBe(CopyStatus.RESERVED);

      await update(onLoan.id, { shelf: 'C-1' }).expect(200);
    });

    it('stanj izposojen in rezerviran ni mogoče nastaviti ročno', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;

      for (const status of [CopyStatus.ON_LOAN, CopyStatus.RESERVED, 'X']) {
        const res = await update(copyId, { status }).expect(400);
        expect(res.body).toMatchObject({
          errors: { status: 'Stanje je lahko samo AVAILABLE ali LOST.' },
        });
      }
      expect(await statusOf(copyId)).toBe(CopyStatus.AVAILABLE);
    });

    it('za neobstoječ izvod vrne 404 »Izvod ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await update(id, { shelf: 'A-1' }).expect(404);
        expect(res.body).toMatchObject({ message: 'Izvod ne obstaja.' });
      }
    });
  });

  describe('dostop po vlogi', () => {
    it('bralec dobi 404 »Ta stran ne obstaja« na vseh poteh za izvode', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;
      const reader = tokens.READER;

      for (const send of [
        () => list(book.id, reader),
        () => create(book.id, { inventoryNumber: 'INV-000999' }, reader),
        () => update(copyId, { status: CopyStatus.LOST }, reader),
        () => remove(copyId, reader),
      ]) {
        const res = await send().expect(404);
        expect(res.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      }

      expect(await prisma.copy.findMany()).toEqual([book.copies[0]]);
    });

    it('brez prijave vrne 401', async () => {
      const book = await createBookWithCopies(prisma);
      const copyId = book.copies[0].id;

      await list(book.id, '').expect(401);
      await create(book.id, { inventoryNumber: 'INV-000999' }, '').expect(401);
      await update(copyId, { status: CopyStatus.LOST }, '').expect(401);
      await remove(copyId, '').expect(401);

      expect(await prisma.copy.findMany()).toEqual([book.copies[0]]);
    });

    it('administrator lahko ureja izvode kot knjižničar', async () => {
      const book = await createBookWithCopies(prisma, 0);
      const admin = tokens.ADMIN;

      const created = await create(
        book.id,
        { inventoryNumber: 'INV-000999' },
        admin,
      ).expect(201);
      const { id } = created.body as CopyBody;
      await list(book.id, admin).expect(200);
      await update(id, { status: CopyStatus.LOST }, admin).expect(200);
      await remove(id, admin).expect(204);

      expect(await prisma.copy.count()).toBe(0);
    });
  });
});
