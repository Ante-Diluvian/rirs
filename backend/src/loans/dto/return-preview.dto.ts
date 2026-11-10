import { ApiProperty } from '@nestjs/swagger';

export class LoanMemberDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Janez' })
  firstName: string;

  @ApiProperty({ example: 'Novak' })
  lastName: string;
}

export class ReturnPreviewDto {
  @ApiProperty({ format: 'uuid' })
  loanId: string;

  @ApiProperty({ example: 'INV-000412' })
  inventoryNumber: string;

  @ApiProperty({ example: 'Alamut' })
  title: string;

  @ApiProperty({ type: LoanMemberDto })
  member: LoanMemberDto;

  @ApiProperty({ format: 'date', example: '2026-09-16' })
  loanedOn: string;

  @ApiProperty({ format: 'date', example: '2026-10-07' })
  dueDate: string;

  @ApiProperty({
    format: 'date',
    description: 'Return date the fine is calculated for (today)',
    example: '2026-10-12',
  })
  returnedOn: string;

  @ApiProperty({
    description: 'Calendar days after the due date, never negative',
    example: 5,
  })
  overdueDays: number;

  @ApiProperty({ description: 'Setting fine_per_day', example: '0.10' })
  finePerDay: string;

  @ApiProperty({ description: 'overdueDays × finePerDay', example: '0.50' })
  fine: string;
}
