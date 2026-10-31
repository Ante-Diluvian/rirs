import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  Author,
  LoanStatus,
  Member,
  ReservationStatus,
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

interface BookBody {
  id: string;
  isbn: string;
  authors: { id: string }[];
}

jest.setTimeout(30_000);

describe('US-07 Upravljanje kataloga: knjige', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bartol: Author;
  let tavcar: Author;
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
    bartol = await prisma.author.create({
      data: { firstName: 'Vladimir', lastName: 'Bartol' },
    });
    tavcar = await prisma.author.create({
      data: { firstName: 'Ivan', lastName: 'Tavčar' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const alamut = () => ({
    title: 'Alamut',
    authorIds: [bartol.id],
    genre: 'Zgodovinski roman',
    isbn: '978-961-01-2345-6',
    publicationYear: 1938,
  });

  const auth = (token?: string) => (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  const http = () => request(app.getHttpServer());
  const create = (body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().post('/books').send(body));
  const update = (id: string, body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().put(`/books/${id}`).send(body));
  const remove = (id: string, token = tokens.LIBRARIAN) =>
    auth(token)(http().delete(`/books/${id}`));

  const loan = (copyId: string, status: LoanStatus) =>
    createLoan(prisma, {
      memberId: users.READER.id,
      librarianId: users.LIBRARIAN.id,
      copyId,
      status,
    });
  const createReservation = (bookId: string, status: ReservationStatus) =>
    prisma.reservation.create({
      data: { memberId: users.READER.id, bookId, status },
    });

  describe('AC1: knjiga zahteva naslov, avtorja, žanr in ISBN s 13 števkami', () => {
    it('doda knjigo, ISBN shrani brez vezajev', async () => {
      const res = await create({
        ...alamut(),
        title: '  Alamut ',
        authorIds: [tavcar.id, bartol.id, bartol.id],
        language: 'slovenski',
      }).expect(201);

      const body = res.body as BookBody;
      expect(body).toEqual({
        id: expect.any(String) as string,
        title: 'Alamut',
        isbn: '9789610123456',
        genre: 'Zgodovinski roman',
        publicationYear: 1938,
        language: 'slovenski',
        description: null,
        authors: [
          { id: bartol.id, firstName: 'Vladimir', lastName: 'Bartol' },
          { id: tavcar.id, firstName: 'Ivan', lastName: 'Tavčar' },
        ],
      });
      expect(
        await prisma.bookAuthor.count({ where: { bookId: body.id } }),
      ).toBe(2);
    });

    it('ISBN sprejme tudi s presledki, leto izida ni obvezno', async () => {
      const res = await create({
        ...alamut(),
        isbn: '978 961 01 2345 6',
        publicationYear: null,
      }).expect(201);

      expect(res.body).toMatchObject({
        isbn: '9789610123456',
        publicationYear: null,
      });
    });

    it('brez obveznih podatkov izpiše napake ob poljih in knjige ne shrani', async () => {
      const res = await create({ title: '   ', genre: '' }).expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: 'Neveljavni podatki',
        errors: {
          title: 'Vnesi naslov',
          authorIds: 'Izberi vsaj enega avtorja',
          genre: 'Vnesi žanr',
          isbn: 'Vnesi ISBN',
        },
      });
      expect(await prisma.book.count()).toBe(0);
    });

    it('zahteva vsaj enega obstoječega avtorja', async () => {
      const cases: [unknown, string][] = [
        [[], 'Izberi vsaj enega avtorja'],
        ['Bartol', 'Izberi vsaj enega avtorja'],
        [['ni-uuid'], 'Izbrani avtor ne obstaja.'],
        [[bartol.id, randomUUID()], 'Izbrani avtor ne obstaja.'],
      ];
      for (const [authorIds, message] of cases) {
        const res = await create({ ...alamut(), authorIds }).expect(400);
        expect(res.body).toMatchObject({ errors: { authorIds: message } });
      }
      expect(await prisma.book.count()).toBe(0);
    });

    it('ISBN mora imeti natanko 13 števk', async () => {
      for (const isbn of [
        '978-961-01-2345',
        '978-961-01-2345-67',
        '978-961-01-234X-6',
      ]) {
        const res = await create({ ...alamut(), isbn }).expect(400);
        expect(res.body).toMatchObject({
          errors: { isbn: 'ISBN mora imeti 13 števk' },
        });
      }
      expect(await prisma.book.count()).toBe(0);
    });

    it('zavrne neveljavno leto izida in predolge vnose', async () => {
      const res = await create({
        ...alamut(),
        title: 'A'.repeat(256),
        publicationYear: 19.5,
        description: 'x'.repeat(5001),
      }).expect(400);

      expect(res.body).toMatchObject({
        errors: {
          title: 'Naslov je predolg, največ 255 znakov',
          publicationYear: 'Leto izida mora biti celo število med 1000 in 2100',
          description: 'Opis je predolg, največ 5000 znakov',
        },
      });
    });

    it('podvojen ISBN zavrne s »Knjiga s tem ISBN že obstaja«', async () => {
      await create(alamut()).expect(201);

      const res = await create({
        ...alamut(),
        title: 'Alamut, 2. izdaja',
        isbn: '9789610123456',
      }).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message: 'Knjiga s tem ISBN že obstaja',
      });
      expect(await prisma.book.count()).toBe(1);
    });

    it('urejanje ne dovoli ISBN druge knjige', async () => {
      const other = await createBookWithCopies(prisma);
      const created = await create(alamut()).expect(201);
      const { id } = created.body as BookBody;

      const res = await update(id, { ...alamut(), isbn: other.isbn }).expect(
        409,
      );

      expect(res.body).toMatchObject({
        message: 'Knjiga s tem ISBN že obstaja',
      });
      expect(
        await prisma.book.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({ isbn: '9789610123456' });
    });
  });

  describe('AC5: sprememba je takoj shranjena', () => {
    it('urejanje zamenja podatke in avtorje knjige', async () => {
      const created = await create(alamut()).expect(201);
      const { id } = created.body as BookBody;

      const res = await update(id, {
        title: 'Cvetje v jeseni',
        authorIds: [tavcar.id],
        genre: 'Roman',
        isbn: '978-961-00-0001-1',
        language: 'slovenski',
      }).expect(200);

      const expected = {
        id,
        title: 'Cvetje v jeseni',
        isbn: '9789610000011',
        genre: 'Roman',
        publicationYear: null,
        language: 'slovenski',
        description: null,
      };
      expect(res.body).toEqual({
        ...expected,
        authors: [{ id: tavcar.id, firstName: 'Ivan', lastName: 'Tavčar' }],
      });
      expect(
        await prisma.book.findUniqueOrThrow({
          where: { id },
          include: { authors: true },
        }),
      ).toMatchObject({ ...expected, authors: [{ authorId: tavcar.id }] });
    });

    it('avtor, odstranjen s knjige, ni več naveden pri njej (US-07 AC4)', async () => {
      const created = await create(alamut()).expect(201);
      const { id } = created.body as BookBody;

      await update(id, { ...alamut(), authorIds: [tavcar.id] }).expect(200);

      await auth(tokens.LIBRARIAN)(
        http().delete(`/authors/${bartol.id}`),
      ).expect(204);
      await auth(tokens.LIBRARIAN)(
        http().delete(`/authors/${tavcar.id}`),
      ).expect(409);
    });

    it('urejanje preveri enaka pravila kot dodajanje', async () => {
      const created = await create(alamut()).expect(201);
      const { id } = created.body as BookBody;

      const res = await update(id, { ...alamut(), authorIds: [] }).expect(400);

      expect(res.body).toMatchObject({
        errors: { authorIds: 'Izberi vsaj enega avtorja' },
      });
      expect(await prisma.bookAuthor.count({ where: { bookId: id } })).toBe(1);
    });

    it('za neobstoječo knjigo vrne 404 »Knjiga ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await update(id, alamut()).expect(404);
        expect(res.body).toMatchObject({ message: 'Knjiga ne obstaja.' });
      }
      expect(await prisma.book.count()).toBe(0);
    });
  });

  describe('AC3: brisanje knjige', () => {
    it('knjige z zgodovino izposoj ni mogoče izbrisati', async () => {
      for (const status of [LoanStatus.RETURNED, LoanStatus.ACTIVE]) {
        const book = await createBookWithCopies(prisma, 2);
        await loan(book.copies[0].id, status);

        const res = await remove(book.id).expect(409);

        expect(res.body).toMatchObject({
          statusCode: 409,
          message: 'Knjige z zgodovino izposoj ni mogoče izbrisati.',
        });
        expect(await prisma.copy.count({ where: { bookId: book.id } })).toBe(2);
      }
    });

    it('knjige z aktivnimi rezervacijami ni mogoče izbrisati', async () => {
      for (const status of [
        ReservationStatus.WAITING,
        ReservationStatus.READY,
      ]) {
        const book = await createBookWithCopies(prisma);
        await createReservation(book.id, status);

        const res = await remove(book.id).expect(409);

        expect(res.body).toMatchObject({
          message: 'Knjige z aktivnimi rezervacijami ni mogoče izbrisati.',
        });
        expect(await prisma.book.count({ where: { id: book.id } })).toBe(1);
      }
    });

    it('knjigo brez izposoj izbriše skupaj z izvodi, avtorji ostanejo', async () => {
      const book = await createBookWithCopies(prisma, 2);
      await createReservation(book.id, ReservationStatus.CANCELLED);
      const other = await createBookWithCopies(prisma);
      const authorId = book.authors[0].authorId;

      await remove(book.id).expect(204);

      expect(await prisma.book.count({ where: { id: book.id } })).toBe(0);
      expect(await prisma.copy.count({ where: { bookId: book.id } })).toBe(0);
      expect(
        await prisma.bookAuthor.count({ where: { bookId: book.id } }),
      ).toBe(0);
      expect(await prisma.reservation.count()).toBe(0);
      expect(await prisma.author.count({ where: { id: authorId } })).toBe(1);
      expect(await prisma.copy.count({ where: { bookId: other.id } })).toBe(1);
    });

    it('za neobstoječo knjigo vrne 404 »Knjiga ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await remove(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Knjiga ne obstaja.' });
      }
    });
  });

  describe('dostop po vlogi', () => {
    it('bralec dobi 404 »Ta stran ne obstaja« na poteh za urejanje knjig', async () => {
      const book = await createBookWithCopies(prisma);
      const reader = tokens.READER;

      for (const send of [
        () => create(alamut(), reader),
        () => update(book.id, alamut(), reader),
        () => remove(book.id, reader),
      ]) {
        const res = await send().expect(404);
        expect(res.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      }

      expect(await prisma.book.findMany({ select: { id: true } })).toEqual([
        { id: book.id },
      ]);
    });

    it('brez prijave vrne 401', async () => {
      const book = await createBookWithCopies(prisma);

      await create(alamut(), '').expect(401);
      await update(book.id, alamut(), '').expect(401);
      await remove(book.id, '').expect(401);

      expect(await prisma.book.count()).toBe(1);
    });

    it('administrator lahko ureja knjige kot knjižničar', async () => {
      const admin = tokens.ADMIN;

      const created = await create(alamut(), admin).expect(201);
      const { id } = created.body as BookBody;
      await update(id, { ...alamut(), title: 'Alamut' }, admin).expect(200);
      await remove(id, admin).expect(204);

      expect(await prisma.book.count()).toBe(0);
    });
  });
});
