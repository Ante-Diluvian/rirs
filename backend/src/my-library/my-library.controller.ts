import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { MyLoanDto } from './dto/my-loan.dto';
import { MyReservationItemDto } from './dto/my-reservation-item.dto';
import { MySummaryDto } from './dto/my-summary.dto';
import { MyLibraryService } from './my-library.service';

@ApiTags('me')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiNotFoundResponse({ description: 'The caller is not a reader' })
@Roles(Role.READER)
@Controller('me')
export class MyLibraryController {
  constructor(private readonly myLibrary: MyLibraryService) {}

  @Get('loans')
  @ApiOperation({
    summary:
      'Active loans of the signed-in reader with days left, overdue state and running fine, ordered by due date',
  })
  @ApiOkResponse({ type: [MyLoanDto] })
  loans(@CurrentUser() user: AuthUser): Promise<MyLoanDto[]> {
    return this.myLibrary.loans(user.id);
  }

  @Get('reservations')
  @ApiOperation({
    summary:
      'Active reservations of the signed-in reader with queue position (WAITING) or pickup deadline (READY), newest first',
  })
  @ApiOkResponse({ type: [MyReservationItemDto] })
  reservations(@CurrentUser() user: AuthUser): Promise<MyReservationItemDto[]> {
    return this.myLibrary.reservations(user.id);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Loan and reservation counts with limits, unpaid fine and whether borrowing is blocked by it',
  })
  @ApiOkResponse({ type: MySummaryDto })
  summary(@CurrentUser() user: AuthUser): Promise<MySummaryDto> {
    return this.myLibrary.summary(user.id);
  }
}
