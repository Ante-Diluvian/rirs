import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client';

export const bookWithAuthors = {
  authors: {
    include: { author: true },
    orderBy: [
      { author: { lastName: 'asc' } },
      { author: { firstName: 'asc' } },
    ],
  },
} satisfies Prisma.BookInclude;

export type BookWithAuthors = Prisma.BookGetPayload<{
  include: typeof bookWithAuthors;
}>;

export class BookAuthorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Vladimir' })
  firstName: string;

  @ApiProperty({ example: 'Bartol' })
  lastName: string;
}

export class BookDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Alamut' })
  title: string;

  @ApiProperty({
    description: 'ISBN-13 without hyphens',
    example: '9789610123456',
  })
  isbn: string;

  @ApiProperty({ example: 'Zgodovinski roman' })
  genre: string;

  @ApiProperty({ type: Number, nullable: true, example: 1938 })
  publicationYear: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'slovenski' })
  language: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: [BookAuthorDto] })
  authors: BookAuthorDto[];

  static from(book: BookWithAuthors): BookDto {
    return {
      id: book.id,
      title: book.title,
      isbn: book.isbn,
      genre: book.genre,
      publicationYear: book.publicationYear,
      language: book.language,
      description: book.description,
      authors: book.authors.map(({ author }) => ({
        id: author.id,
        firstName: author.firstName,
        lastName: author.lastName,
      })),
    };
  }
}
