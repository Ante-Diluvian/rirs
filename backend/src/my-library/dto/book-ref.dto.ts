import { ApiProperty } from '@nestjs/swagger';
import {
  BookAuthorDto,
  BookDto,
  BookWithAuthors,
} from '../../books/dto/book.dto';

export class BookRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Alamut' })
  title: string;

  @ApiProperty({ type: [BookAuthorDto] })
  authors: BookAuthorDto[];

  static from(book: BookWithAuthors): BookRefDto {
    const { id, title, authors } = BookDto.from(book);
    return { id, title, authors };
  }
}
