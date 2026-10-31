import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ example: 'ok', description: 'Service status' })
  status: 'ok';
}
