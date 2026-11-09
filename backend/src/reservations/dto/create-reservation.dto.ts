import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Messages } from '../../common/messages';

export class CreateReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: Messages.reservations.bookRequired })
  bookId: string;
}
