import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Messages } from '../../common/messages';
import { normalizeIsbn, trim, trimToNull } from '../../common/transforms';

// PUT zamenja vse te podatke, izpuščeno neobvezno polje postane null
export class SaveBookDto {
  @ApiProperty({ maxLength: 255, example: 'Alamut' })
  @Transform(trim)
  @IsString({ message: Messages.books.titleRequired })
  @IsNotEmpty({ message: Messages.books.titleRequired })
  @MaxLength(255, { message: Messages.books.titleTooLong })
  title: string;

  @ApiProperty({ type: [String], format: 'uuid', minItems: 1 })
  @IsArray({ message: Messages.books.authorsRequired })
  @ArrayNotEmpty({ message: Messages.books.authorsRequired })
  @IsUUID('all', { each: true, message: Messages.books.authorNotFound })
  authorIds: string[];

  @ApiProperty({ maxLength: 100, example: 'Zgodovinski roman' })
  @Transform(trim)
  @IsString({ message: Messages.books.genreRequired })
  @IsNotEmpty({ message: Messages.books.genreRequired })
  @MaxLength(100, { message: Messages.books.genreTooLong })
  genre: string;

  @ApiProperty({
    description: '13 digits; hyphens and spaces are removed',
    example: '978-961-01-2345-6',
  })
  @Transform(normalizeIsbn)
  @IsString({ message: Messages.books.isbnRequired })
  @IsNotEmpty({ message: Messages.books.isbnRequired })
  @Matches(/^\d{13}$/, { message: Messages.books.isbnInvalid })
  isbn: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1000,
    maximum: 2100,
    nullable: true,
    example: 1938,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsInt({ message: Messages.books.yearInvalid })
  @Min(1000, { message: Messages.books.yearInvalid })
  @Max(2100, { message: Messages.books.yearInvalid })
  publicationYear?: number | null;

  @ApiPropertyOptional({
    type: String,
    maxLength: 50,
    nullable: true,
    example: 'slovenski',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(50, { message: Messages.books.languageTooLong })
  language?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 5000, nullable: true })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(5000, { message: Messages.books.descriptionTooLong })
  description?: string | null;
}
