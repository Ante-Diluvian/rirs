import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { GenresController } from './genres.controller';

@Module({
  controllers: [BooksController, GenresController],
  providers: [BooksService],
})
export class BooksModule {}
