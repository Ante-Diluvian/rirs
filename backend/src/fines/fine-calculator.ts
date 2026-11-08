import { Injectable } from '@nestjs/common';
import { diffDays } from '../common/dates';
import { Settings } from '../settings/settings.service';

export interface Fine {
  overdueDays: number;
  fineCents: number;
}

@Injectable()
export class FineCalculator {
  // koledarski dnevi v Ljubljani (YYYY-MM-DD), vračilo do roka nima zamude
  calculate(
    dueDate: string,
    returnedOn: string,
    settings: Pick<Settings, 'finePerDayCents'>,
  ): Fine {
    const overdueDays = Math.max(0, diffDays(returnedOn, dueDate));
    return { overdueDays, fineCents: overdueDays * settings.finePerDayCents };
  }
}
