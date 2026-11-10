import { ApiProperty } from '@nestjs/swagger';
import { BookRefDto } from './book-ref.dto';

export class MyLoanDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: BookRefDto })
  book: BookRefDto;

  @ApiProperty({ format: 'date', example: '2026-09-16' })
  loanedOn: string;

  @ApiProperty({ format: 'date', example: '2026-10-07' })
  dueDate: string;

  @ApiProperty({
    description: 'Days until the due date, 0 when due today or overdue',
    example: 0,
  })
  daysLeft: number;

  @ApiProperty({ description: 'Due date is before today', example: true })
  isOverdue: boolean;

  @ApiProperty({ example: 5 })
  overdueDays: number;

  @ApiProperty({
    description: 'Running fine of an overdue loan, 0.00 otherwise',
    example: '0.50',
  })
  fine: string;

  @ApiProperty({
    description: 'Not overdue and due within the next 3 days',
    example: false,
  })
  dueSoon: boolean;
}
