import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import { fieldError } from '../common/validation';
import {
  CopyStatus,
  Prisma,
  ReservationStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MyReservationDto } from '../reservations/dto/reservation.dto';
import { ACTIVE_RESERVATION } from '../reservations/reservation-policy';
import { ReservationQueueService } from '../reservations/reservation-queue.service';
import { SettingsService } from '../settings/settings.service';
import { BookDto, bookWithAuthors } from './dto/book.dto';
import { BookDetailDto } from './dto/book-detail.dto';
import {
  Availability,
  BookListItemDto,
  BookPageDto,
} from './dto/book-list.dto';
import { SaveBookDto } from './dto/save-book.dto';
import { SearchBooksDto } from './dto/search-books.dto';
import { toIsbn13 } from './isbn';

export const BOOK_PAGE_SIZE = 20;

// US-02 AC1: naslov ali avtor vsebuje niz, poln ISBN se ujema v celoti
function textMatch(query: string): Prisma.BookWhereInput {
  const words = query.split(/\s+/).filter(Boolean);
  const conditions: Prisma.BookWhereInput[] = [
    { title: { contains: words.join(' '), mode: 'insensitive' } },
    // vsaka beseda v imenu ali priimku istega avtorja, npr. »george orwell«
    {
      authors: {
        some: {
          author: {
            AND: words.map((word) => ({
              OR: [
                { firstName: { contains: word, mode: 'insensitive' } },
                { lastName: { contains: word, mode: 'insensitive' } },
              ],
            })),
          },
        },
      },
    },
  ];
  const isbn = toIsbn13(query);
  if (isbn) conditions.push({ isbn });
  return { OR: conditions };
}

// US-02 AC2: filtra se kombinirata z nizom
function searchWhere({
  q,
  genre,
  available,
}: SearchBooksDto): Prisma.BookWhereInput {
  return {
    AND: [
      q ? textMatch(q) : {},
      genre ? { genre } : {},
      available ? { copies: { some: { status: CopyStatus.AVAILABLE } } } : {},
    ],
  };
}

function countOf(rows: { _count: { _all: number } }[]): number {
  return rows.reduce((sum, row) => sum + row._count._all, 0);
}

function toData(dto: SaveBookDto) {
  return {
    title: dto.title,
    isbn: dto.isbn,
    genre: dto.genre,
    publicationYear: dto.publicationYear ?? null,
    language: dto.language ?? null,
    description: dto.description ?? null,
  };
}

// podvojen avtor bi kršil primarni ključ book_author
function authorLinks(dto: SaveBookDto) {
  return [...new Set(dto.authorIds)].map((authorId) => ({ authorId }));
}

// edini unikatni ključ knjige je ISBN, tuji ključ pa avtor
function toWriteError(error: unknown): unknown {
  if (isPrismaError(error, 'P2002')) {
    return new ConflictException(Messages.books.isbnTaken);
  }
  if (isPrismaError(error, 'P2003')) {
    return fieldError('authorIds', Messages.books.authorNotFound);
  }
  if (isPrismaError(error, 'P2025')) {
    return new NotFoundException(Messages.books.notFound);
  }
  return error;
}

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ReservationQueueService,
    private readonly settings: SettingsService,
  ) {}

  async search(query: SearchBooksDto, memberId: string): Promise<BookPageDto> {
    const where = searchWhere(query);
    const page = query.page ?? 1;
    const [total, books] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        include: bookWithAuthors,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * BOOK_PAGE_SIZE,
        take: BOOK_PAGE_SIZE,
      }),
    ]);
    const ids = books.map((book) => book.id);
    const [availability, reservations] = await Promise.all([
      this.availability(ids),
      this.myReservations(ids, memberId),
    ]);
    return {
      items: books.map((book, i) =>
        BookListItemDto.from(book, availability[i], reservations[i]),
      ),
      total,
      page,
      pageSize: BOOK_PAGE_SIZE,
    };
  }

  async findOne(id: string, memberId: string): Promise<BookDetailDto> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: bookWithAuthors,
    });
    if (!book) throw new NotFoundException(Messages.books.notFound);
    const [[availability], [myReservation], settings] = await Promise.all([
      this.availability([id]),
      this.myReservations([id], memberId),
      this.settings.get(),
    ]);
    return {
      ...BookDto.from(book),
      ...availability,
      myReservation,
      pickupDays: settings.pickupDays,
    };
  }

  // aktivna rezervacija člana za vsako knjigo (največ ena, delni indeks
  // reservation_one_active_per_member_book), v vrstnem redu bookIds
  private async myReservations(
    bookIds: string[],
    memberId: string,
  ): Promise<(MyReservationDto | null)[]> {
    if (bookIds.length === 0) return [];
    const reservations = await this.prisma.reservation.findMany({
      where: {
        bookId: { in: bookIds },
        memberId,
        status: { in: ACTIVE_RESERVATION },
      },
    });
    const positions = await this.queue.positions(
      this.prisma,
      reservations.map((reservation) => reservation.id),
    );
    return bookIds.map((id) => {
      const reservation = reservations.find((r) => r.bookId === id);
      return reservation ? MyReservationDto.from(reservation, positions) : null;
    });
  }

  async genres(): Promise<string[]> {
    const rows = await this.prisma.book.findMany({
      distinct: ['genre'],
      select: { genre: true },
      orderBy: { genre: 'asc' },
    });
    return rows.map((row) => row.genre);
  }

  // US-02 AC3: dve združevalni poizvedbi za vse knjige hkrati, v vrstnem redu bookIds
  private async availability(bookIds: string[]): Promise<Availability[]> {
    if (bookIds.length === 0) return [];
    const [copies, queues] = await Promise.all([
      this.prisma.copy.groupBy({
        by: ['bookId', 'status'],
        where: { bookId: { in: bookIds }, status: { not: CopyStatus.LOST } },
        _count: { _all: true },
      }),
      this.prisma.reservation.groupBy({
        by: ['bookId'],
        where: { bookId: { in: bookIds }, status: ReservationStatus.WAITING },
        _count: { _all: true },
      }),
    ]);
    return bookIds.map((id) => {
      const own = copies.filter((row) => row.bookId === id);
      return {
        availableCopies: countOf(
          own.filter((row) => row.status === CopyStatus.AVAILABLE),
        ),
        totalCopies: countOf(own),
        queueLength: countOf(queues.filter((row) => row.bookId === id)),
      };
    });
  }

  async create(dto: SaveBookDto): Promise<BookDto> {
    try {
      const book = await this.prisma.book.create({
        data: { ...toData(dto), authors: { create: authorLinks(dto) } },
        include: bookWithAuthors,
      });
      return BookDto.from(book);
    } catch (error) {
      throw toWriteError(error);
    }
  }

  async update(id: string, dto: SaveBookDto): Promise<BookDto> {
    try {
      const book = await this.prisma.book.update({
        where: { id },
        data: {
          ...toData(dto),
          authors: { deleteMany: {}, create: authorLinks(dto) },
        },
        include: bookWithAuthors,
      });
      return BookDto.from(book);
    } catch (error) {
      throw toWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // zaklep knjige in izvodov počaka sočasno izposojo, rezervacijo ali nov izvod
      const [book] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM book WHERE id = ${id}::uuid FOR UPDATE`;
      if (!book) throw new NotFoundException(Messages.books.notFound);
      await tx.$queryRaw`SELECT id FROM copy WHERE book_id = ${id}::uuid FOR UPDATE`;

      // US-07 AC3: tudi vrnjena izposoja je zgodovina
      if (await tx.loan.count({ where: { copy: { bookId: id } } })) {
        throw new ConflictException(Messages.books.hasLoans);
      }
      const active = await tx.reservation.count({
        where: { bookId: id, status: { in: ACTIVE_RESERVATION } },
      });
      if (active) {
        throw new ConflictException(Messages.books.hasActiveReservations);
      }

      // povezave z avtorji izbriše CASCADE
      await tx.reservation.deleteMany({ where: { bookId: id } });
      await tx.copy.deleteMany({ where: { bookId: id } });
      await tx.book.delete({ where: { id } });
    });
  }
}
