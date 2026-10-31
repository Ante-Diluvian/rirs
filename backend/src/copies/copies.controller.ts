import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CopiesService } from './copies.service';
import { CopyDto } from './dto/copy.dto';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';

const bookIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.books.notFound),
});
const copyIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.copies.notFound),
});

@ApiTags('copies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Roles(Role.LIBRARIAN, Role.ADMIN)
@Controller()
export class CopiesController {
  constructor(private readonly copies: CopiesService) {}

  @Get('books/:bookId/copies')
  @ApiOperation({ summary: 'List all copies of a book' })
  @ApiOkResponse({ type: [CopyDto] })
  @ApiNotFoundResponse({
    description: 'Book does not exist, or the caller is not a librarian',
  })
  findByBook(@Param('bookId', bookIdPipe) bookId: string): Promise<CopyDto[]> {
    return this.copies.findByBook(bookId);
  }

  @Post('books/:bookId/copies')
  @ApiOperation({ summary: 'Add an available copy to a book' })
  @ApiCreatedResponse({ type: CopyDto })
  @ApiBadRequestResponse({ description: 'Invalid fields' })
  @ApiNotFoundResponse({
    description: 'Book does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({ description: 'Inventory number is already used' })
  create(
    @Param('bookId', bookIdPipe) bookId: string,
    @Body() dto: CreateCopyDto,
  ): Promise<CopyDto> {
    return this.copies.create(bookId, dto);
  }

  @Patch('copies/:id')
  @ApiOperation({
    summary: 'Change the shelf of a copy, or mark it as lost or available',
  })
  @ApiOkResponse({ type: CopyDto })
  @ApiBadRequestResponse({ description: 'Invalid fields' })
  @ApiNotFoundResponse({
    description: 'Copy does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({
    description: 'Status of a copy on loan or reserved cannot be changed',
  })
  update(
    @Param('id', copyIdPipe) id: string,
    @Body() dto: UpdateCopyDto,
  ): Promise<CopyDto> {
    return this.copies.update(id, dto);
  }

  @Delete('copies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a copy without loan history' })
  @ApiNoContentResponse({ description: 'Copy deleted' })
  @ApiNotFoundResponse({
    description: 'Copy does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({ description: 'Copy has loan history or is reserved' })
  remove(@Param('id', copyIdPipe) id: string): Promise<void> {
    return this.copies.remove(id);
  }
}
