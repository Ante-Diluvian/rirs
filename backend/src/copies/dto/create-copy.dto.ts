import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Messages } from '../../common/messages';
import { trim, trimToNull } from '../../common/transforms';

export class CreateCopyDto {
  @ApiProperty({ maxLength: 20, example: 'INV-000412' })
  @Transform(trim)
  @IsString({ message: Messages.copies.inventoryRequired })
  @IsNotEmpty({ message: Messages.copies.inventoryRequired })
  @MaxLength(20, { message: Messages.copies.inventoryTooLong })
  inventoryNumber: string;

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
}
