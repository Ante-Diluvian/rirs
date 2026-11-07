import { ApiProperty } from '@nestjs/swagger';
import { BookDto } from './book.dto';
import { Availability } from './book-list.dto';

export class BookDetailDto extends BookDto implements Availability {
  @ApiProperty({ description: 'Copies with status AVAILABLE', example: 0 })
  availableCopies: number;

  @ApiProperty({ description: 'All copies except LOST', example: 2 })
  totalCopies: number;

  @ApiProperty({ description: 'Reservations with status WAITING', example: 2 })
  queueLength: number;
}
