import { PickType } from '@nestjs/swagger';
import { LoanRequestDto } from './loan-request.dto';

// isto preverjanje inventarne številke kot pri izposoji
export class ReturnRequestDto extends PickType(LoanRequestDto, [
  'inventoryNumber',
] as const) {}
