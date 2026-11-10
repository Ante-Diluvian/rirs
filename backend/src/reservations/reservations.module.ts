import { Module } from '@nestjs/common';
import { ReservationPolicy } from './reservation-policy';
import { ReservationQueueService } from './reservation-queue.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationQueueService, ReservationPolicy, ReservationsService],
  exports: [ReservationQueueService],
})
export class ReservationsModule {}
