import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Messages } from '../common/messages';
import { Role } from '../generated/prisma/client';
import { BooksService } from './books.service';
import { BookDto } from './dto/book.dto';
import { SaveBookDto } from './dto/save-book.dto';

const bookIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.books.notFound),
});

@ApiTags('books')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Post()
  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a book with at least one author' })
  @ApiCreatedResponse({ type: BookDto })
  @ApiBadRequestResponse({ description: 'Invalid fields or unknown author' })
  @ApiNotFoundResponse({ description: 'The caller is not a librarian' })
  @ApiConflictResponse({ description: 'A book with this ISBN already exists' })
  create(@Body() dto: SaveBookDto): Promise<BookDto> {
    return this.books.create(dto);
  }

  @Put(':id')
  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @ApiOperation({ summary: 'Replace the data and authors of a book' })
  @ApiOkResponse({ type: BookDto })
  @ApiBadRequestResponse({ description: 'Invalid fields or unknown author' })
  @ApiNotFoundResponse({
    description: 'Book does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({ description: 'A book with this ISBN already exists' })
  update(
    @Param('id', bookIdPipe) id: string,
    @Body() dto: SaveBookDto,
  ): Promise<BookDto> {
    return this.books.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.LIBRARIAN, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a book with its copies; refused if it has loans or active reservations',
  })
  @ApiNoContentResponse({ description: 'Book deleted' })
  @ApiNotFoundResponse({
    description: 'Book does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({
    description: 'Book has loan history or active reservations',
  })
  remove(@Param('id', bookIdPipe) id: string): Promise<void> {
    return this.books.remove(id);
  }
}
