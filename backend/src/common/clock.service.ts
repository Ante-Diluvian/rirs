import { Injectable } from '@nestjs/common';
import { todayInLjubljana } from './dates';

// domenska logika datuma ne bere iz new Date(), da ga testi lahko določijo
@Injectable()
export class ClockService {
  today(): string {
    return todayInLjubljana();
  }
}
