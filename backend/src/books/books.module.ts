import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { GenresController } from './genres.controller';

@Module({
  imports: [ReservationsModule],
  controllers: [BooksController, GenresController],
  providers: [BooksService],
})
export class BooksModule {}
