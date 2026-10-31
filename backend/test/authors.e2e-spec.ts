import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { toDbDate } from '../src/common/dates';
import { Role } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createBookWithCopies,
  createUser,
  login,
  resetDatabase,
} from './factories';

const bartol = {
  firstName: 'Vladimir',
  lastName: 'Bartol',
  birthDate: '1903-02-24',
  country: 'Slovenija',
  biography: 'Slovenski pisatelj, avtor romana Alamut.',
};

interface AuthorBody {
  id: string;
  firstName: string;
  lastName: string;
}

jest.setTimeout(30_000);

describe('US-07 Upravljanje kataloga: avtorji', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
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
      const user = await createUser(prisma, role);
      tokens[role] = await login(app, user.email);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (token?: string) => (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  const http = () => request(app.getHttpServer());
  const search = (q?: string, token = tokens.LIBRARIAN) =>
    auth(token)(
      http()
        .get('/authors')
        .query(q === undefined ? {} : { q }),
    );
  const create = (body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().post('/authors').send(body));
  const update = (id: string, body: object, token = tokens.LIBRARIAN) =>
    auth(token)(http().put(`/authors/${id}`).send(body));
  const remove = (id: string, token = tokens.LIBRARIAN) =>
    auth(token)(http().delete(`/authors/${id}`));

  const createBartol = () =>
    prisma.author.create({
      data: { ...bartol, birthDate: toDbDate(bartol.birthDate) },
    });
  const namesOf = (body: unknown) =>
    (body as AuthorBody[]).map((a) => `${a.firstName} ${a.lastName}`);

  describe('AC4: brisanje avtorja', () => {
    it('avtorja, ki je naveden pri knjigi, ni mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma);
      const authorId = book.authors[0].authorId;

      const res = await remove(authorId).expect(409);

      expect(res.body).toMatchObject({
        statusCode: 409,
        message:
          'Avtorja, ki je naveden pri vsaj eni knjigi, ni mogoče izbrisati.',
      });
      expect(await prisma.author.count({ where: { id: authorId } })).toBe(1);
      expect(await prisma.bookAuthor.count({ where: { authorId } })).toBe(1);
    });

    it('soavtorja knjige prav tako ni mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma);
      const coauthor = await prisma.author.create({
        data: { firstName: 'Aldous', lastName: 'Huxley' },
      });
      await prisma.bookAuthor.create({
        data: { bookId: book.id, authorId: coauthor.id },
      });

      await remove(coauthor.id).expect(409);

      expect(await prisma.author.count({ where: { id: coauthor.id } })).toBe(1);
    });

    it('avtorja brez knjig izbriše', async () => {
      const author = await createBartol();

      await remove(author.id).expect(204);

      expect(await prisma.author.count()).toBe(0);
    });

    it('ko avtor ni več naveden pri nobeni knjigi, ga je mogoče izbrisati', async () => {
      const book = await createBookWithCopies(prisma);
      const authorId = book.authors[0].authorId;
      await prisma.bookAuthor.deleteMany({ where: { authorId } });

      await remove(authorId).expect(204);

      expect(await prisma.author.count({ where: { id: authorId } })).toBe(0);
      expect(await prisma.book.count({ where: { id: book.id } })).toBe(1);
    });

    it('za neobstoječega avtorja vrne 404 »Avtor ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await remove(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Avtor ne obstaja.' });
      }
    });
  });

  describe('iskanje avtorjev', () => {
    beforeEach(async () => {
      await prisma.author.createMany({
        data: [
          { firstName: 'Ivan', lastName: 'Tavčar' },
          { firstName: 'Vladimir', lastName: 'Bartol' },
          { firstName: 'Ivan', lastName: 'Cankar' },
          { firstName: 'George', lastName: 'Orwell' },
        ],
      });
    });

    it('najde avtorje po imenu ali priimku ne glede na velike in male črke', async () => {
      const byFirstName = await search('ivan').expect(200);
      expect(namesOf(byFirstName.body)).toEqual(['Ivan Cankar', 'Ivan Tavčar']);

      const byLastName = await search('BARTOL').expect(200);
      expect(namesOf(byLastName.body)).toEqual(['Vladimir Bartol']);

      const byPart = await search('orw').expect(200);
      expect(namesOf(byPart.body)).toEqual(['George Orwell']);
    });

    it('najde avtorja po imenu in priimku v poljubnem vrstnem redu', async () => {
      for (const q of ['vladimir bar', 'Bartol Vladimir']) {
        const res = await search(q).expect(200);
        expect(namesOf(res.body)).toEqual(['Vladimir Bartol']);
      }
    });

    it('brez zadetkov vrne prazen seznam', async () => {
      await search('tolstoj').expect(200).expect([]);
    });

    it('vrne največ 20 avtorjev, urejenih po priimku in imenu', async () => {
      await prisma.author.createMany({
        data: Array.from({ length: 21 }, (_, i) => ({
          firstName: 'Avtor',
          lastName: `Zz${String(i).padStart(2, '0')}`,
        })),
      });

      const all = await search().expect(200);
      expect(all.body).toHaveLength(20);
      expect(namesOf(all.body).slice(0, 5)).toEqual([
        'Vladimir Bartol',
        'Ivan Cankar',
        'George Orwell',
        'Ivan Tavčar',
        'Avtor Zz00',
      ]);

      const filtered = await search('zz').expect(200);
      expect(filtered.body).toHaveLength(20);
    });

    it('zavrne predolg iskalni niz z napako ob polju', async () => {
      const res = await search('a'.repeat(101)).expect(400);

      expect(res.body).toMatchObject({
        message: 'Neveljavni podatki',
        errors: { q: 'Iskalni niz je lahko dolg največ 100 znakov' },
      });
    });
  });

  describe('dodajanje in urejanje avtorja', () => {
    it('doda avtorja z vsemi podatki', async () => {
      const res = await create({
        ...bartol,
        firstName: '  Vladimir ',
        country: ' Slovenija ',
      }).expect(201);

      const body = res.body as AuthorBody;
      expect(body).toEqual({ id: expect.any(String) as string, ...bartol });
      const saved = await prisma.author.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(saved).toMatchObject({
        firstName: 'Vladimir',
        country: 'Slovenija',
      });
      expect(saved.birthDate?.toISOString()).toBe('1903-02-24T00:00:00.000Z');
    });

    it('neobvezna polja so lahko prazna', async () => {
      const res = await create({
        firstName: 'Ivan',
        lastName: 'Cankar',
        birthDate: '',
        country: '   ',
      }).expect(201);

      expect(res.body).toMatchObject({
        birthDate: null,
        country: null,
        biography: null,
      });
    });

    it('zahteva ime in priimek', async () => {
      const res = await create({ firstName: '  ', biography: 'x' }).expect(400);

      expect(res.body).toMatchObject({
        message: 'Neveljavni podatki',
        errors: { firstName: 'Vnesi ime', lastName: 'Vnesi priimek' },
      });
      expect(await prisma.author.count()).toBe(0);
    });

    it('zavrne neveljaven datum rojstva in predolge vnose', async () => {
      for (const birthDate of ['1903-02-30', '24. 2. 1903', '1903-2-24']) {
        const res = await create({ ...bartol, birthDate }).expect(400);
        expect(res.body).toMatchObject({
          errors: { birthDate: 'Vnesi veljaven datum v obliki LLLL-MM-DD' },
        });
      }

      const res = await create({
        ...bartol,
        lastName: 'B'.repeat(101),
        biography: 'x'.repeat(2001),
      }).expect(400);
      expect(res.body).toMatchObject({
        errors: {
          lastName: 'Vnos je predolg, največ 100 znakov',
          biography: 'Življenjepis je predolg, največ 2000 znakov',
        },
      });
      expect(await prisma.author.count()).toBe(0);
    });

    it('uredi avtorja, izpuščena neobvezna polja pobriše', async () => {
      const author = await createBartol();

      const res = await update(author.id, {
        firstName: 'Vladimir',
        lastName: 'Bartol',
        country: 'Italija',
      }).expect(200);

      expect(res.body).toEqual({
        id: author.id,
        firstName: 'Vladimir',
        lastName: 'Bartol',
        birthDate: null,
        country: 'Italija',
        biography: null,
      });
      expect(
        await prisma.author.findUniqueOrThrow({ where: { id: author.id } }),
      ).toMatchObject({ country: 'Italija', birthDate: null, biography: null });
    });

    it('urejanje preveri enaka pravila kot dodajanje', async () => {
      const author = await createBartol();

      const res = await update(author.id, { firstName: 'Vladimir' }).expect(
        400,
      );

      expect(res.body).toMatchObject({
        errors: { lastName: 'Vnesi priimek' },
      });
      expect(
        await prisma.author.findUniqueOrThrow({ where: { id: author.id } }),
      ).toMatchObject({ lastName: 'Bartol' });
    });

    it('za neobstoječega avtorja vrne 404 »Avtor ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await update(id, bartol).expect(404);
        expect(res.body).toMatchObject({ message: 'Avtor ne obstaja.' });
      }
      expect(await prisma.author.count()).toBe(0);
    });
  });

  describe('dostop po vlogi', () => {
    it('bralec dobi 404 »Ta stran ne obstaja« na vseh poteh za avtorje', async () => {
      const author = await createBartol();
      const reader = tokens.READER;

      // zahteve ustvari šele v zanki, ker supertest po vsaki zapre strežnik
      for (const send of [
        () => search(undefined, reader),
        () => create(bartol, reader),
        () => update(author.id, { ...bartol, lastName: 'Novak' }, reader),
        () => remove(author.id, reader),
      ]) {
        const res = await send().expect(404);
        expect(res.body).toMatchObject({ message: 'Ta stran ne obstaja' });
      }

      expect(
        await prisma.author.findMany({ select: { lastName: true } }),
      ).toEqual([{ lastName: 'Bartol' }]);
    });

    it('brez prijave vrne 401', async () => {
      const author = await createBartol();

      await search(undefined, '').expect(401);
      await create(bartol, '').expect(401);
      await update(author.id, bartol, '').expect(401);
      await remove(author.id, '').expect(401);

      expect(await prisma.author.count()).toBe(1);
    });

    it('administrator lahko ureja avtorje kot knjižničar', async () => {
      const admin = tokens.ADMIN;

      const created = await create(bartol, admin).expect(201);
      const { id } = created.body as AuthorBody;
      await update(id, { ...bartol, country: 'Italija' }, admin).expect(200);
      await search('bartol', admin).expect(200);
      await remove(id, admin).expect(204);

      expect(await prisma.author.count()).toBe(0);
    });
  });
});
