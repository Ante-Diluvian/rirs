import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Messages } from '../common/messages';
import { Role } from '../generated/prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

const reservationIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(Messages.reservations.notFound),
});

@ApiTags('reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@Roles(Role.READER)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Reserve a book without an available copy and join its queue',
  })
  @ApiCreatedResponse({ type: ReservationDto })
  @ApiBadRequestResponse({ description: 'Missing or invalid bookId' })
  @ApiNotFoundResponse({
    description: 'Book does not exist, or the caller is not a reader',
  })
  @ApiConflictResponse({ description: 'A reservation rule is not satisfied' })
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationDto> {
    return this.reservations.create(user.id, dto.bookId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Cancel own WAITING or READY reservation; a READY copy goes to the next in the queue',
  })
  @ApiNoContentResponse({ description: 'Reservation cancelled' })
  @ApiForbiddenResponse({
    description: 'Reservation belongs to another member',
  })
  @ApiNotFoundResponse({
    description: 'Reservation does not exist, or the caller is not a reader',
  })
  @ApiConflictResponse({ description: 'Reservation is no longer active' })
  cancel(
    @Param('id', reservationIdPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.reservations.cancel(user.id, id);
  }
}
