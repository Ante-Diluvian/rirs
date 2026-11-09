import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  Author,
  CopyStatus,
  ReservationStatus,
  Role,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createMember,
  createUser,
  login,
  resetDatabase,
  setSettings,
} from './factories';

interface BookPage {
  items: { title: string }[];
  total: number;
  page: number;
  pageSize: number;
}

interface BookOptions {
  authors?: Author[];
  genre?: string;
  year?: number;
  isbn?: string;
  language?: string;
  description?: string;
  copies?: CopyStatus[];
}

type Query = Record<string, string | number | boolean>;

jest.setTimeout(30_000);

describe('US-02 Iskanje po katalogu z razpoložljivostjo', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let orwell: Author;
  let tavcar: Author;
  let isbnCounter = 0;

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
    await setSettings(app);
    const reader = await createUser(prisma, Role.READER);
    token = await login(app, reader.email);
    orwell = await prisma.author.create({
      data: { firstName: 'George', lastName: 'Orwell' },
    });
    tavcar = await prisma.author.create({
      data: { firstName: 'Ivan', lastName: 'Tavčar' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const addBook = (title: string, options: BookOptions = {}) =>
    prisma.book.create({
      data: {
        title,
        isbn: options.isbn ?? `978961${String(++isbnCounter).padStart(7, '0')}`,
        genre: options.genre ?? 'roman',
        publicationYear: options.year ?? null,
        language: options.language ?? null,
        description: options.description ?? null,
        authors: {
          create: (options.authors ?? [orwell]).map((author) => ({
            authorId: author.id,
          })),
        },
        copies: {
          create: (options.copies ?? []).map((status) => ({
            inventoryNumber: `INV-${randomUUID().slice(0, 8)}`,
            status,
          })),
        },
      },
    });

  const http = () => request(app.getHttpServer());
  const search = (query: Query = {}, auth = token) =>
    http().get('/books').query(query).set('Authorization', `Bearer ${auth}`);
  const titles = async (query: Query) => {
    const res = await search(query).expect(200);
    return (res.body as BookPage).items.map((item) => item.title);
  };
  const detail = (id: string, auth = token) =>
    http().get(`/books/${id}`).set('Authorization', `Bearer ${auth}`);

  // vsak član ima lahko samo eno aktivno rezervacijo naslova
  const addReservations = async (
    bookId: string,
    statuses: ReservationStatus[],
  ) => {
    for (const status of statuses) {
      const member = await createMember(prisma);
      await prisma.reservation.create({
        data: { memberId: member.id, bookId, status },
      });
    }
  };

  describe('AC1: iskanje po naslovu, avtorju in ISBN', () => {
    beforeEach(async () => {
      await addBook('1984');
      await addBook('Animal Farm');
      await addBook('Cvetje v jeseni', { authors: [tavcar] });
      await addBook('Visoška kronika', { authors: [tavcar] });
    });

    it('naslov vsebuje niz, ne glede na velike in male črke', async () => {
      expect(await titles({ q: 'FARM' })).toEqual(['Animal Farm']);
      expect(await titles({ q: 'oška kro' })).toEqual(['Visoška kronika']);
      expect(await titles({ q: 'VISOŠKA' })).toEqual(['Visoška kronika']);
    });

    it('ime ali priimek avtorja vsebuje niz', async () => {
      expect(await titles({ q: 'orwel' })).toEqual(['1984', 'Animal Farm']);
      expect(await titles({ q: 'george' })).toEqual(['1984', 'Animal Farm']);
      expect(await titles({ q: 'IVAN TAVČAR' })).toEqual([
        'Cvetje v jeseni',
        'Visoška kronika',
      ]);
      expect(await titles({ q: 'ivan orwell' })).toEqual([]);
    });

    it('ISBN se ujema samo v celoti, z vezaji ali brez njih', async () => {
      await addBook('Alamut', { authors: [tavcar], isbn: '9780306406157' });

      expect(await titles({ q: '978-0-306-40615-7' })).toEqual(['Alamut']);
      expect(await titles({ q: '9780306406157' })).toEqual(['Alamut']);
      expect(await titles({ q: '0-306-40615-2' })).toEqual(['Alamut']);
      expect(await titles({ q: '978-0-306' })).toEqual([]);
      expect(await titles({ q: '40615' })).toEqual([]);
    });

    it('niz, krajši od 3 znakov, zavrne, prazen niz vrne vse knjige', async () => {
      for (const q of ['ab', ' a ']) {
        const res = await search({ q }).expect(400);
        expect(res.body).toEqual({
          statusCode: 400,
          message: 'Neveljavni podatki',
          errors: { q: 'Iskalni niz mora imeti vsaj 3 znake' },
        });
      }
      expect(await titles({ q: '  ' })).toHaveLength(4);
    });
  });

  describe('AC2: filtra žanr in samo s prostim izvodom', () => {
    it('žanr se kombinira z iskalnim nizom', async () => {
      await addBook('1984', { genre: 'znanstvena fantastika' });
      await addBook('Animal Farm', { genre: 'roman' });
      await addBook('Homage to Catalonia', { genre: 'biografija' });
      await addBook('Cvetje v jeseni', { authors: [tavcar], genre: 'roman' });

      expect(await titles({ q: 'orwell', genre: 'roman' })).toEqual([
        'Animal Farm',
      ]);
      expect(await titles({ genre: 'roman' })).toEqual([
        'Animal Farm',
        'Cvetje v jeseni',
      ]);
    });

    it('samo s prostim izvodom upošteva samo izvode s stanjem Prost', async () => {
      await addBook('1984', {
        copies: [CopyStatus.ON_LOAN, CopyStatus.RESERVED],
      });
      await addBook('Animal Farm', {
        copies: [CopyStatus.AVAILABLE, CopyStatus.LOST],
      });
      await addBook('Homage to Catalonia', { copies: [CopyStatus.LOST] });
      await addBook('Burmese Days');

      expect(await titles({ available: true })).toEqual(['Animal Farm']);
      expect(await titles({ available: false })).toHaveLength(4);
    });

    it('niz in oba filtra skupaj', async () => {
      const available = [CopyStatus.AVAILABLE];
      await addBook('Animal Farm', { copies: available });
      await addBook('Burmese Days', { copies: [CopyStatus.ON_LOAN] });
      await addBook('1984', { genre: 'distopija', copies: available });
      await addBook('Cvetje v jeseni', {
        authors: [tavcar],
        copies: available,
      });

      expect(
        await titles({ q: 'orwell', genre: 'roman', available: true }),
      ).toEqual(['Animal Farm']);
    });

    it('GET /genres vrne žanre brez ponovitev, po abecedi', async () => {
      await addBook('1984', { genre: 'znanstvena fantastika' });
      await addBook('Animal Farm', { genre: 'roman' });
      await addBook('Cvetje v jeseni', { genre: 'roman' });
      await addBook('Homage to Catalonia', { genre: 'biografija' });

      const res = await http()
        .get('/genres')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([
        'biografija',
        'roman',
        'znanstvena fantastika',
      ]);
    });

    it('neveljaven filter zavrne z napako ob polju', async () => {
      const res = await search({
        available: 'da',
        genre: 'x'.repeat(101),
      }).expect(400);

      expect(res.body).toMatchObject({
        errors: {
          available: 'Vrednost je lahko samo true ali false',
          genre: 'Žanr je predolg, največ 100 znakov',
        },
      });
    });
  });

  describe('AC3: zadetek z razpoložljivostjo in dolžino vrste', () => {
    it('vrne naslov, avtorje, leto, žanr, proste od vseh izvodov in dolžino vrste', async () => {
      const book = await addBook('1984', {
        genre: 'znanstvena fantastika',
        year: 1949,
        copies: [
          CopyStatus.AVAILABLE,
          CopyStatus.ON_LOAN,
          CopyStatus.RESERVED,
          CopyStatus.LOST,
        ],
      });
      const empty = await addBook('Animal Farm', { year: 1945 });
      // dolžina vrste šteje samo čakajoče rezervacije
      await addReservations(book.id, [
        ReservationStatus.WAITING,
        ReservationStatus.WAITING,
        ReservationStatus.READY,
        ReservationStatus.CANCELLED,
        ReservationStatus.FULFILLED,
      ]);

      const res = await search({ q: 'orwell' }).expect(200);

      const author = { id: orwell.id, firstName: 'George', lastName: 'Orwell' };
      expect(res.body).toEqual({
        items: [
          {
            id: book.id,
            title: '1984',
            isbn: book.isbn,
            genre: 'znanstvena fantastika',
            publicationYear: 1949,
            authors: [author],
            availableCopies: 1,
            totalCopies: 3,
            queueLength: 2,
            myReservation: null,
          },
          {
            id: empty.id,
            title: 'Animal Farm',
            isbn: empty.isbn,
            genre: 'roman',
            publicationYear: 1945,
            authors: [author],
            availableCopies: 0,
            totalCopies: 0,
            queueLength: 0,
            myReservation: null,
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('AC3: podrobnosti knjige (GET /books/:id)', () => {
    it('vrne podatke knjige, avtorje, proste od vseh izvodov in dolžino vrste', async () => {
      const book = await addBook('1984', {
        authors: [tavcar, orwell],
        genre: 'znanstvena fantastika',
        year: 1949,
        language: 'angleški',
        description: 'Distopični roman.',
        copies: [CopyStatus.ON_LOAN, CopyStatus.ON_LOAN, CopyStatus.LOST],
      });
      await addReservations(book.id, [
        ReservationStatus.WAITING,
        ReservationStatus.WAITING,
        ReservationStatus.CANCELLED,
      ]);

      const res = await detail(book.id).expect(200);

      expect(res.body).toEqual({
        id: book.id,
        title: '1984',
        isbn: book.isbn,
        genre: 'znanstvena fantastika',
        publicationYear: 1949,
        language: 'angleški',
        description: 'Distopični roman.',
        authors: [
          { id: orwell.id, firstName: 'George', lastName: 'Orwell' },
          { id: tavcar.id, firstName: 'Ivan', lastName: 'Tavčar' },
        ],
        availableCopies: 0,
        totalCopies: 2,
        queueLength: 2,
        myReservation: null,
        pickupDays: 3,
      });
    });

    it('razpoložljivost je enaka kot pri zadetku v iskanju', async () => {
      const book = await addBook('Animal Farm', {
        copies: [CopyStatus.AVAILABLE, CopyStatus.RESERVED],
      });
      await addReservations(book.id, [ReservationStatus.WAITING]);

      const found = await search({ q: 'animal' }).expect(200);
      const res = await detail(book.id).expect(200);

      const counts = { availableCopies: 1, totalCopies: 2, queueLength: 1 };
      expect(found.body).toMatchObject({ items: [counts] });
      expect(res.body).toMatchObject(counts);
    });

    it('za neobstoječo knjigo vrne 404 »Knjiga ne obstaja.«', async () => {
      for (const id of [randomUUID(), 'ni-uuid']) {
        const res = await detail(id).expect(404);
        expect(res.body).toMatchObject({ message: 'Knjiga ne obstaja.' });
      }
    });
  });

  describe('AC4: strani po 20 zadetkov s skupnim številom', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 25; i++) {
        await addBook(`Knjiga ${String(i).padStart(2, '0')}`);
      }
    });

    it('razdeli rezultate na strani po 20 in vrne skupno število zadetkov', async () => {
      const first = await search().expect(200);
      const second = await search({ page: 2 }).expect(200);
      const beyond = await search({ page: 3 }).expect(200);

      const page = (res: request.Response) => res.body as BookPage;
      expect(page(first)).toMatchObject({ total: 25, page: 1, pageSize: 20 });
      expect(page(first).items).toHaveLength(20);
      expect(page(first).items[0].title).toBe('Knjiga 01');
      expect(page(first).items[19].title).toBe('Knjiga 20');
      expect(page(second).items.map((item) => item.title)).toEqual([
        'Knjiga 21',
        'Knjiga 22',
        'Knjiga 23',
        'Knjiga 24',
        'Knjiga 25',
      ]);
      expect(page(beyond)).toMatchObject({ items: [], total: 25, page: 3 });
    });

    it('skupno število upošteva iskalni niz', async () => {
      const res = await search({ q: 'knjiga 1' }).expect(200);

      expect(res.body).toMatchObject({ total: 10 });
    });

    it('neveljavno številko strani zavrne', async () => {
      for (const page of ['0', '-1', '1.5', 'prva', '100001']) {
        const res = await search({ page }).expect(400);
        expect(res.body).toMatchObject({
          errors: { page: 'Neveljavna številka strani' },
        });
      }
    });
  });

  describe('dostop', () => {
    it('iskanje, podrobnosti knjige in žanre lahko berejo vse vloge', async () => {
      const book = await addBook('1984');
      for (const role of [Role.READER, Role.LIBRARIAN, Role.ADMIN]) {
        const user = await createUser(prisma, role);
        const auth = await login(app, user.email);
        await search({ q: '1984' }, auth).expect(200);
        await detail(book.id, auth).expect(200);
        await http()
          .get('/genres')
          .set('Authorization', `Bearer ${auth}`)
          .expect(200);
      }
    });

    it('brez prijave vrne 401', async () => {
      await http().get('/books').expect(401);
      await http().get(`/books/${randomUUID()}`).expect(401);
      await http().get('/genres').expect(401);
    });
  });
});
