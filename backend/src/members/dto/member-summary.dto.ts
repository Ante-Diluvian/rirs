import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../auth/dto/user.dto';

export class MemberSummaryDto extends UserDto {
  @ApiProperty({ description: 'Loans that are not returned', example: 3 })
  activeLoans: number;

  @ApiProperty({ description: 'Setting max_active_loans', example: 5 })
  maxActiveLoans: number;

  @ApiProperty({
    description:
      'Unpaid, not waived fines of returned loans plus running fines of overdue loans',
    example: '0.50',
  })
  unpaidFine: string;

  @ApiProperty({ example: false })
  isBlocked: boolean;
}
