import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthDto } from './dto/health.dto';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check that the API is running' })
  @ApiOkResponse({ type: HealthDto })
  check(): HealthDto {
    return { status: 'ok' };
  }
}
