import { ApiProperty } from '@nestjs/swagger';
import { fromDbDate } from '../../common/dates';
import { Loan, LoanStatus } from '../../generated/prisma/client';

export class LoanDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  memberId: string;

  @ApiProperty({ example: 'INV-002301' })
  inventoryNumber: string;

  @ApiProperty({ example: 'Alamut' })
  title: string;

  @ApiProperty({ format: 'date', example: '2026-10-12' })
  loanedOn: string;

  @ApiProperty({ format: 'date', example: '2026-11-02' })
  dueDate: string;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  status: LoanStatus;

  static from(
    loan: Loan,
    copy: { inventoryNumber: string; book: { title: string } },
  ): LoanDto {
    return {
      id: loan.id,
      memberId: loan.memberId,
      inventoryNumber: copy.inventoryNumber,
      title: copy.book.title,
      loanedOn: fromDbDate(loan.loanedOn),
      dueDate: fromDbDate(loan.dueDate),
      status: loan.status,
    };
  }
}
