import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Messages } from '../../common/messages';
import { trim } from '../../common/transforms';

export class SearchAuthorsDto {
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Words matched against first or last name',
    example: 'bartol',
  })
  @Transform(trim)
  @IsOptional()
  @IsString({ message: Messages.authors.queryInvalid })
  @MaxLength(100, { message: Messages.authors.queryInvalid })
  q?: string;
}
