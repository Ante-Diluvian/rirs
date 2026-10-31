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
  Post,
  Put,
  Query,
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
import { AuthorsService } from './authors.service';
import { AuthorDto } from './dto/author.dto';
import { SaveAuthorDto } from './dto/save-author.dto';
import { SearchAuthorsDto } from './dto/search-authors.dto';

const authorIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.authors.notFound),
});

@ApiTags('authors')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Roles(Role.LIBRARIAN, Role.ADMIN)
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search authors by first or last name (at most 20 results)',
  })
  @ApiOkResponse({ type: [AuthorDto] })
  @ApiBadRequestResponse({ description: 'Query is too long' })
  @ApiNotFoundResponse({ description: 'The caller is not a librarian' })
  search(@Query() query: SearchAuthorsDto): Promise<AuthorDto[]> {
    return this.authors.search(query.q);
  }

  @Post()
  @ApiOperation({ summary: 'Create an author' })
  @ApiCreatedResponse({ type: AuthorDto })
  @ApiBadRequestResponse({ description: 'Invalid fields' })
  @ApiNotFoundResponse({ description: 'The caller is not a librarian' })
  create(@Body() dto: SaveAuthorDto): Promise<AuthorDto> {
    return this.authors.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace the data of an author' })
  @ApiOkResponse({ type: AuthorDto })
  @ApiBadRequestResponse({ description: 'Invalid fields' })
  @ApiNotFoundResponse({
    description: 'Author does not exist, or the caller is not a librarian',
  })
  update(
    @Param('id', authorIdPipe) id: string,
    @Body() dto: SaveAuthorDto,
  ): Promise<AuthorDto> {
    return this.authors.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an author who is not listed on any book' })
  @ApiNoContentResponse({ description: 'Author deleted' })
  @ApiNotFoundResponse({
    description: 'Author does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({ description: 'Author is listed on at least one book' })
  remove(@Param('id', authorIdPipe) id: string): Promise<void> {
    return this.authors.remove(id);
  }
}
