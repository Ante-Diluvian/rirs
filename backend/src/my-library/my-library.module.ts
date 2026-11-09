import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module';
import { MembersModule } from '../members/members.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { MyLibraryController } from './my-library.controller';
import { MyLibraryService } from './my-library.service';

@Module({
  imports: [FinesModule, MembersModule, ReservationsModule],
  controllers: [MyLibraryController],
  providers: [MyLibraryService],
})
export class MyLibraryModule {}
