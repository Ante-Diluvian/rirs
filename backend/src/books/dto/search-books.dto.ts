import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Messages } from '../../common/messages';
import { toBoolean, toNumber, trimToNull } from '../../common/transforms';

export class SearchBooksDto {
  @ApiPropertyOptional({
    minLength: 3,
    maxLength: 100,
    description:
      'Matched against title and author names; a full ISBN-10 or ISBN-13 also matches the ISBN',
    example: 'orwell',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MinLength(3, { message: Messages.books.queryTooShort })
  @MaxLength(100, { message: Messages.books.queryTooLong })
  q?: string | null;

  @ApiPropertyOptional({ maxLength: 100, example: 'roman' })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(100, { message: Messages.books.genreTooLong })
  genre?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Only books with at least one available copy',
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: Messages.books.availableInvalid })
  available?: boolean;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt({ message: Messages.books.pageInvalid })
  @Min(1, { message: Messages.books.pageInvalid })
  @Max(100_000, { message: Messages.books.pageInvalid })
  page?: number;
}
