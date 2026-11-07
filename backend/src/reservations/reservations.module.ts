import { Module } from '@nestjs/common';
import { ReservationQueueService } from './reservation-queue.service';

@Module({
  providers: [ReservationQueueService],
  exports: [ReservationQueueService],
})
export class ReservationsModule {}
