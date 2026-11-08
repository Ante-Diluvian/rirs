import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module';
import { MembersModule } from '../members/members.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { LoanPolicy } from './loan-policy';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { ReturnsService } from './returns.service';

@Module({
  imports: [FinesModule, MembersModule, ReservationsModule],
  controllers: [LoansController],
  providers: [LoansService, LoanPolicy, ReturnsService],
})
export class LoansModule {}
