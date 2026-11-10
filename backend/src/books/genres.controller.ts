import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BooksService } from './books.service';

@ApiTags('books')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Controller('genres')
export class GenresController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Distinct genres of all books, sorted' })
  @ApiOkResponse({ type: [String] })
  findAll(): Promise<string[]> {
    return this.books.genres();
  }
}
