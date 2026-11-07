import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { LoanPolicy } from './loan-policy';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [MembersModule],
  controllers: [LoansController],
  providers: [LoansService, LoanPolicy],
})
export class LoansModule {}
