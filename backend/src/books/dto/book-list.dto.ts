import { ApiProperty } from '@nestjs/swagger';
import { BookAuthorDto, BookDto, BookWithAuthors } from './book.dto';

export interface Availability {
  availableCopies: number;
  totalCopies: number;
  queueLength: number;
}

export class BookListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '1984' })
  title: string;

  @ApiProperty({ example: '9789610123456' })
  isbn: string;

  @ApiProperty({ example: 'znanstvena fantastika' })
  genre: string;

  @ApiProperty({ type: Number, nullable: true, example: 1949 })
  publicationYear: number | null;

  @ApiProperty({ type: [BookAuthorDto] })
  authors: BookAuthorDto[];

  @ApiProperty({ description: 'Copies with status AVAILABLE', example: 1 })
  availableCopies: number;

  @ApiProperty({ description: 'All copies except LOST', example: 3 })
  totalCopies: number;

  @ApiProperty({ description: 'Reservations with status WAITING', example: 2 })
  queueLength: number;

  static from(
    book: BookWithAuthors,
    availability: Availability,
  ): BookListItemDto {
    const { id, title, isbn, genre, publicationYear, authors } =
      BookDto.from(book);
    return {
      id,
      title,
      isbn,
      genre,
      publicationYear,
      authors,
      ...availability,
    };
  }
}

export class BookPageDto {
  @ApiProperty({ type: [BookListItemDto] })
  items: BookListItemDto[];

  @ApiProperty({ description: 'Number of all matching books', example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}
