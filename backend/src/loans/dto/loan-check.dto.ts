import { ApiProperty } from '@nestjs/swagger';
import { LoanRule, LoanRuleCheck } from '../loan-policy';

export class LoanRuleCheckDto implements LoanRuleCheck {
  @ApiProperty({ enum: LoanRule, example: LoanRule.MAX_ACTIVE_LOANS })
  rule: LoanRule;

  @ApiProperty({ example: true })
  passed: boolean;

  @ApiProperty({
    description: 'Rule label when passed, otherwise the reason',
    example: 'Manj kot 5 aktivnih izposoj',
  })
  message: string;
}

export class LoanCheckDto {
  @ApiProperty({
    type: [LoanRuleCheckDto],
    description: 'All five rules in the order they are applied',
  })
  checks: LoanRuleCheckDto[];

  @ApiProperty({ format: 'date', example: '2026-11-02' })
  dueDate: string;

  @ApiProperty({ example: 21 })
  loanPeriodDays: number;
}
