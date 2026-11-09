import { ApiProperty } from '@nestjs/swagger';
import { MyReservationDto } from '../../reservations/dto/reservation.dto';
import { BookDto } from './book.dto';
import { Availability } from './book-list.dto';

export class BookDetailDto extends BookDto implements Availability {
  @ApiProperty({ description: 'Copies with status AVAILABLE', example: 0 })
  availableCopies: number;

  @ApiProperty({ description: 'All copies except LOST', example: 2 })
  totalCopies: number;

  @ApiProperty({ description: 'Reservations with status WAITING', example: 2 })
  queueLength: number;

  @ApiProperty({
    type: MyReservationDto,
    nullable: true,
    description: "The caller's WAITING or READY reservation of this book",
  })
  myReservation: MyReservationDto | null;
}
