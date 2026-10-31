import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from './books.service';
import { BookWithAuthors } from './dto/book.dto';
import { SaveBookDto } from './dto/save-book.dto';

const AUTHOR_ID = '0b6f4c1e-8a2d-4f3b-9c5e-7d1a2b3c4d5e';
const BOOK_ID = '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const book: BookWithAuthors = {
  id: BOOK_ID,
  title: 'Alamut',
  isbn: '9789610123456',
  publicationYear: 1938,
  pageCount: null,
  genre: 'Zgodovinski roman',
  language: null,
  description: null,
  price: null,
  createdAt: new Date('2026-10-12T10:00:00Z'),
  authors: [
    {
      bookId: BOOK_ID,
      authorId: AUTHOR_ID,
      author: {
        id: AUTHOR_ID,
        firstName: 'Vladimir',
        lastName: 'Bartol',
        birthDate: null,
        country: null,
        biography: null,
      },
    },
  ],
};

const dto: SaveBookDto = {
  title: 'Alamut',
  authorIds: [AUTHOR_ID, AUTHOR_ID],
  genre: 'Zgodovinski roman',
  isbn: '9789610123456',
  publicationYear: 1938,
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`napaka ${code}`, {
    code,
    clientVersion: '7',
  });
}

describe('BooksService', () => {
  let prisma: { book: { create: jest.Mock; update: jest.Mock } };
  let service: BooksService;

  beforeEach(() => {
    prisma = {
      book: {
        create: jest.fn().mockResolvedValue(book),
        update: jest.fn().mockResolvedValue(book),
      },
    };
    service = new BooksService(prisma as unknown as PrismaService);
  });

  it('podvojenega avtorja poveže s knjigo samo enkrat', async () => {
    await service.create(dto);

    expect(prisma.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authors: { create: [{ authorId: AUTHOR_ID }] },
        }) as unknown,
      }),
    );
  });

  it('urejanje zamenja vse avtorje knjige', async () => {
    await service.update(BOOK_ID, { ...dto, publicationYear: undefined });

    expect(prisma.book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOK_ID },
        data: expect.objectContaining({
          publicationYear: null,
          authors: { deleteMany: {}, create: [{ authorId: AUTHOR_ID }] },
        }) as unknown,
      }),
    );
  });

  it('vrne avtorje knjige brez vmesne tabele', async () => {
    await expect(service.create(dto)).resolves.toMatchObject({
      isbn: '9789610123456',
      authors: [{ id: AUTHOR_ID, firstName: 'Vladimir', lastName: 'Bartol' }],
    });
  });

  it('US-07 AC1: podvojen ISBN vrne 409 »Knjiga s tem ISBN že obstaja«', async () => {
    prisma.book.create.mockRejectedValue(prismaError('P2002'));

    await expect(service.create(dto)).rejects.toThrow(
      new ConflictException('Knjiga s tem ISBN že obstaja'),
    );
  });

  it('neobstoječ avtor vrne napako ob polju authorIds', async () => {
    prisma.book.create.mockRejectedValue(prismaError('P2003'));

    const error = (await service
      .create(dto)
      .catch((e: unknown) => e)) as BadRequestException;
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toEqual({
      statusCode: 400,
      message: 'Neveljavni podatki',
      errors: { authorIds: 'Izbrani avtor ne obstaja.' },
    });
  });

  it('urejanje neobstoječe knjige vrne 404', async () => {
    prisma.book.update.mockRejectedValue(prismaError('P2025'));

    await expect(service.update(BOOK_ID, dto)).rejects.toThrow(
      new NotFoundException('Knjiga ne obstaja.'),
    );
  });
});
