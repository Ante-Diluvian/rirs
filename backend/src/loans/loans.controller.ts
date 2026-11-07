import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { LoanRequestDto } from './dto/loan-request.dto';
import { LoanCheckDto } from './dto/loan-check.dto';
import { LoanDto } from './dto/loan.dto';
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
  check(@Body() dto: LoanRequestDto): Promise<LoanCheckDto> {
    return this.loans.check(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Record a loan after checking all loan rules' })
  @ApiCreatedResponse({ type: LoanDto })
  @ApiBadRequestResponse({ description: 'Missing member or inventory number' })
  @ApiNotFoundResponse({
    description:
      'Member or copy does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({
    description: 'A loan rule is not satisfied (message of the first one)',
  })
  create(
    @Body() dto: LoanRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LoanDto> {
    // knjižničar, ki izposojo evidentira, se shrani v librarianId
    return this.loans.create(dto, user.id);
  }
}
