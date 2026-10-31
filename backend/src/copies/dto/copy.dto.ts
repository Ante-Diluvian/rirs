import { ApiProperty } from '@nestjs/swagger';
import { Copy, CopyStatus } from '../../generated/prisma/client';

export class CopyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookId: string;

  @ApiProperty({ example: 'INV-000412' })
  inventoryNumber: string;

  @ApiProperty({ enum: CopyStatus, example: CopyStatus.AVAILABLE })
  status: CopyStatus;

  @ApiProperty({ type: String, nullable: true, example: 'A-12' })
  shelf: string | null;

  static from(copy: Copy): CopyDto {
    return {
      id: copy.id,
      bookId: copy.bookId,
      inventoryNumber: copy.inventoryNumber,
      status: copy.status,
      shelf: copy.shelf,
    };
  }
}
