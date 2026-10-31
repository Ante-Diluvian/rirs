import { ApiProperty } from '@nestjs/swagger';
import { fromDbDate } from '../../common/dates';
import { Author } from '../../generated/prisma/client';

export class AuthorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Vladimir' })
  firstName: string;

  @ApiProperty({ example: 'Bartol' })
  lastName: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '1903-02-24',
  })
  birthDate: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Slovenija' })
  country: string | null;

  @ApiProperty({ type: String, nullable: true })
  biography: string | null;

  static from(author: Author): AuthorDto {
    return {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      birthDate: author.birthDate ? fromDbDate(author.birthDate) : null,
      country: author.country,
      biography: author.biography,
    };
  }
}
