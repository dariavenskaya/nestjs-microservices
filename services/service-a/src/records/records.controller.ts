import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from '../events/events.service';
import { RecordsService } from './records.service';
import { SearchDto } from './search.dto';

@ApiTags('Records')
@Controller('records')
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly eventsService: EventsService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search records using the text index, with cursor pagination' })
  async search(@Query() dto: SearchDto) {
    const started = Date.now();
    const result = await this.recordsService.search(dto.q, dto.cursor, dto.limit);
    await this.eventsService.publishApiAction('RECORDS_SEARCHED', {
      query: dto.q ?? '',
      cursor: dto.cursor ?? '',
      limit: result.limit,
      resultCount: result.data.length,
      total: result.total,
      duration: Date.now() - started,
    });
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one record by id' })
  async getById(@Param('id') id: string) {
    const started = Date.now();
    const result = await this.recordsService.getById(id);
    await this.eventsService.publishApiAction('RECORD_RETRIEVED', {
      recordId: id,
      duration: Date.now() - started,
    });
    return result;
  }
}
