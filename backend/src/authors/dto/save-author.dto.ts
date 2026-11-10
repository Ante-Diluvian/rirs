import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Messages } from '../../common/messages';
import { trim, trimToNull } from '../../common/transforms';

// PUT zamenja vse podatke, zato izpuščeno neobvezno polje postane null
export class SaveAuthorDto {
  @ApiProperty({ maxLength: 100, example: 'Vladimir' })
  @Transform(trim)
  @IsString({ message: Messages.authors.firstNameRequired })
  @IsNotEmpty({ message: Messages.authors.firstNameRequired })
  @MaxLength(100, { message: Messages.authors.textTooLong })
  firstName: string;

  @ApiProperty({ maxLength: 100, example: 'Bartol' })
  @Transform(trim)
  @IsString({ message: Messages.authors.lastNameRequired })
  @IsNotEmpty({ message: Messages.authors.lastNameRequired })
  @MaxLength(100, { message: Messages.authors.textTooLong })
  lastName: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
    example: '1903-02-24',
  })
  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: Messages.authors.birthDateInvalid,
  })
  // strict zavrne neobstoječe datume, npr. 2026-02-30
  @IsISO8601({ strict: true }, { message: Messages.authors.birthDateInvalid })
  birthDate?: string | null;

  @ApiPropertyOptional({
    type: String,
    maxLength: 100,
    nullable: true,
    example: 'Slovenija',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(100, { message: Messages.authors.textTooLong })
  country?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 2000, nullable: true })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(2000, { message: Messages.authors.biographyTooLong })
  biography?: string | null;
}
