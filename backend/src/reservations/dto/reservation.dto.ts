import { ApiProperty } from '@nestjs/swagger';
import { fromDbDate } from '../../common/dates';
import { Reservation, ReservationStatus } from '../../generated/prisma/client';

// stanje rezervacije bralca, tudi polje myReservation na strani knjige
export class MyReservationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.WAITING })
  status: ReservationStatus;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Position in the queue, only for WAITING',
    example: 2,
  })
  position: number | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description: 'Last day to pick up the copy, only for READY',
    example: null,
  })
  readyUntil: string | null;

  static from(
    reservation: Reservation,
    positions: Map<string, number>,
  ): MyReservationDto {
    return {
      id: reservation.id,
      status: reservation.status,
      position: positions.get(reservation.id) ?? null,
      readyUntil: reservation.readyUntil
        ? fromDbDate(reservation.readyUntil)
        : null,
    };
  }
}

export class ReservationDto extends MyReservationDto {
  @ApiProperty({ format: 'uuid' })
  bookId: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  static from(
    reservation: Reservation,
    positions: Map<string, number>,
  ): ReservationDto {
    return {
      ...MyReservationDto.from(reservation, positions),
      bookId: reservation.bookId,
      createdAt: reservation.createdAt.toISOString(),
    };
  }
}
