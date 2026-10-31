import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toDbDate } from '../common/dates';
import { Messages } from '../common/messages';
import { isPrismaError } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorDto } from './dto/author.dto';
import { SaveAuthorDto } from './dto/save-author.dto';

export const AUTHOR_SEARCH_LIMIT = 20;

function toData(dto: SaveAuthorDto) {
  return {
    firstName: dto.firstName,
    lastName: dto.lastName,
    birthDate: dto.birthDate ? toDbDate(dto.birthDate) : null,
    country: dto.country ?? null,
    biography: dto.biography ?? null,
  };
}

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  // vsaka beseda se mora pojaviti v imenu ali priimku, npr. »vladimir bar«
  async search(query = ''): Promise<AuthorDto[]> {
    const words = query.split(/\s+/).filter(Boolean);
    const authors = await this.prisma.author.findMany({
      where: {
        AND: words.map((word) => ({
          OR: [
            { firstName: { contains: word, mode: 'insensitive' } },
            { lastName: { contains: word, mode: 'insensitive' } },
          ],
        })),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: AUTHOR_SEARCH_LIMIT,
    });
    return authors.map((author) => AuthorDto.from(author));
  }

  async create(dto: SaveAuthorDto): Promise<AuthorDto> {
    const author = await this.prisma.author.create({ data: toData(dto) });
    return AuthorDto.from(author);
  }

  async update(id: string, dto: SaveAuthorDto): Promise<AuthorDto> {
    try {
      const author = await this.prisma.author.update({
        where: { id },
        data: toData(dto),
      });
      return AuthorDto.from(author);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(Messages.authors.notFound);
      }
      throw error;
    }
  }

  // tuji ključ v book_author (RESTRICT) zavrne brisanje tudi ob sočasnem dodajanju knjige
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.author.delete({ where: { id } });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException(Messages.authors.notFound);
      }
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(Messages.authors.hasBooks);
      }
      throw error;
    }
  }
}
