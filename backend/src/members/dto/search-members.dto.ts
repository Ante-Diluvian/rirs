import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Messages } from '../../common/messages';
import { trim } from '../../common/transforms';

export class SearchMembersDto {
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Words matched against first name, last name or email',
    example: 'maja kovač',
  })
  @Transform(trim)
  @IsOptional()
  @IsString({ message: Messages.members.queryInvalid })
  @MaxLength(100, { message: Messages.members.queryInvalid })
  q?: string;
}
