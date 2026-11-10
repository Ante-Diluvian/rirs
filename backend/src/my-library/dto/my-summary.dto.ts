import { ApiProperty } from '@nestjs/swagger';

export class MySummaryDto {
  @ApiProperty({
    format: 'date',
    description: 'Today in Europe/Ljubljana',
    example: '2026-10-12',
  })
  today: string;

  @ApiProperty({ description: 'Loans that are not returned', example: 3 })
  activeLoans: number;

  @ApiProperty({ description: 'Setting max_active_loans', example: 5 })
  maxActiveLoans: number;

  @ApiProperty({ description: 'WAITING and READY reservations', example: 2 })
  activeReservations: number;

  @ApiProperty({ description: 'Setting max_active_reservations', example: 3 })
  maxActiveReservations: number;

  @ApiProperty({
    description:
      'Unpaid, not waived fines of returned loans plus running fines of overdue loans',
    example: '0.50',
  })
  unpaidFine: string;

  @ApiProperty({ description: 'Setting fine_limit', example: '5.00' })
  fineLimit: string;

  @ApiProperty({
    description: 'Unpaid fine is above fine_limit, so borrowing is refused',
    example: false,
  })
  borrowingBlocked: boolean;
}
