import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
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
import { ReturnPreviewDto } from './dto/return-preview.dto';
import { ReturnRequestDto } from './dto/return-request.dto';
import { ReturnDto } from './dto/return.dto';
import { LoansService } from './loans.service';
import { ReturnsService } from './returns.service';

@ApiTags('loans')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Roles(Role.LIBRARIAN, Role.ADMIN)
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly returns: ReturnsService,
  ) {}

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

  @Get('return-preview')
  @ApiOperation({
    summary:
      'Show the member, due date, overdue days and fine of an open loan without returning it',
  })
  @ApiOkResponse({ type: ReturnPreviewDto })
  @ApiBadRequestResponse({ description: 'Missing inventory number' })
  @ApiNotFoundResponse({
    description:
      'Copy does not exist or is not on loan, or the caller is not a librarian',
  })
  returnPreview(@Query() query: ReturnRequestDto): Promise<ReturnPreviewDto> {
    return this.returns.preview(query.inventoryNumber);
  }

  @Post('return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Return a copy: close the loan with its fine and assign the copy to the oldest waiting reservation',
  })
  @ApiOkResponse({ type: ReturnDto })
  @ApiBadRequestResponse({ description: 'Missing inventory number' })
  @ApiNotFoundResponse({
    description: 'Copy does not exist, or the caller is not a librarian',
  })
  @ApiConflictResponse({ description: 'Copy is not on loan' })
  returnCopy(@Body() dto: ReturnRequestDto): Promise<ReturnDto> {
    return this.returns.returnCopy(dto.inventoryNumber);
  }
}
