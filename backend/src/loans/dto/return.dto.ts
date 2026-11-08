import { ApiProperty } from '@nestjs/swagger';
import { CopyStatus } from '../../generated/prisma/client';
import { ReturnPreviewDto } from './return-preview.dto';

export class ReservedForDto {
  @ApiProperty({ format: 'uuid' })
  reservationId: string;

  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty({ example: 'Luka' })
  firstName: string;

  @ApiProperty({ example: 'Zupan' })
  lastName: string;

  @ApiProperty({
    format: 'date',
    description: 'Last day to pick up the copy (today + pickup_days)',
    example: '2026-10-15',
  })
  readyUntil: string;
}

export class ReturnDto extends ReturnPreviewDto {
  @ApiProperty({
    enum: [CopyStatus.AVAILABLE, CopyStatus.RESERVED],
    description:
      'RESERVED when the copy goes to the oldest waiting reservation',
    example: CopyStatus.RESERVED,
  })
  copyStatus: CopyStatus;

  @ApiProperty({
    type: ReservedForDto,
    nullable: true,
    description: 'Member the copy is reserved for, null when it is available',
  })
  reservedFor: ReservedForDto | null;
}
