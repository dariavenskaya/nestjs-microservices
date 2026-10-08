import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogQueryDto } from './log-query.dto';
import { LogsService } from './logs.service';

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Query stored Service A events by type and date' })
  query(@Query() dto: LogQueryDto) {
    return this.logsService.query(dto);
  }
}
