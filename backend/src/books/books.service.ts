import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import { fieldError } from '../common/validation';
import { ReservationStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookDto, bookWithAuthors } from './dto/book.dto';
import { SaveBookDto } from './dto/save-book.dto';

const ACTIVE_RESERVATION = [ReservationStatus.WAITING, ReservationStatus.READY];

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
  constructor(private readonly prisma: PrismaService) {}

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
