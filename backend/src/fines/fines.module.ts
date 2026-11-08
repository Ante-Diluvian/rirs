import { Module } from '@nestjs/common';
import { FineCalculator } from './fine-calculator';

@Module({
  providers: [FineCalculator],
  exports: [FineCalculator],
})
export class FinesModule {}
