import { ApiProperty } from '@nestjs/swagger';
import { MyReservationDto } from '../../reservations/dto/reservation.dto';
import { BookRefDto } from './book-ref.dto';

export class MyReservationItemDto extends MyReservationDto {
  @ApiProperty({ type: BookRefDto })
  book: BookRefDto;

  @ApiProperty({
    format: 'date',
    description: 'Day of the reservation in Europe/Ljubljana',
    example: '2026-10-12',
  })
  reservedOn: string;
}
