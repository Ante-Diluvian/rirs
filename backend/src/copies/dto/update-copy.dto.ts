import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Messages } from '../../common/messages';
import { trimToNull } from '../../common/transforms';
import { CopyStatus } from '../../generated/prisma/client';

// ON_LOAN in RESERVED nastavljata samo izposoja in vračilo
export const MANUAL_COPY_STATUSES = [
  CopyStatus.AVAILABLE,
  CopyStatus.LOST,
] as const;

// izpuščeno polje se ne spremeni, polica null jo pobriše
export class UpdateCopyDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 50,
    nullable: true,
    example: 'A-12',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: Messages.validation.invalidInput })
  @MaxLength(50, { message: Messages.copies.shelfTooLong })
  shelf?: string | null;

  @ApiPropertyOptional({ enum: MANUAL_COPY_STATUSES, example: CopyStatus.LOST })
  @IsOptional()
  @IsIn(MANUAL_COPY_STATUSES, { message: Messages.copies.statusInvalid })
  status?: (typeof MANUAL_COPY_STATUSES)[number];
}
