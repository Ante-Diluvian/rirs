import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { CheckLoanDto } from './dto/check-loan.dto';
import { LoanCheckDto } from './dto/loan-check.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Roles(Role.LIBRARIAN, Role.ADMIN)
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check all loan rules and the due date without recording a loan',
  })
  @ApiOkResponse({ type: LoanCheckDto })
  @ApiBadRequestResponse({ description: 'Missing member or inventory number' })
  @ApiNotFoundResponse({
    description:
      'Member or copy does not exist, or the caller is not a librarian',
  })
  check(@Body() dto: CheckLoanDto): Promise<LoanCheckDto> {
    return this.loans.check(dto);
  }
}
