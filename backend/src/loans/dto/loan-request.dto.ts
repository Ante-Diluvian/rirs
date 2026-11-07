import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { Messages } from '../../common/messages';
import { trim } from '../../common/transforms';

export class LoanRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: Messages.loans.memberRequired })
  memberId: string;

  @ApiProperty({ maxLength: 20, example: 'INV-002301' })
  @Transform(trim)
  @IsString({ message: Messages.copies.inventoryRequired })
  @IsNotEmpty({ message: Messages.copies.inventoryRequired })
  @MaxLength(20, { message: Messages.copies.inventoryTooLong })
  inventoryNumber: string;
}
