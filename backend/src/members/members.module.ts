import { Module } from '@nestjs/common';
import { FinesModule } from '../fines/fines.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [FinesModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
