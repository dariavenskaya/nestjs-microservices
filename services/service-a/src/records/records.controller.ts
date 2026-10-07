import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from '../events/events.service.ts';
import { RecordsService } from './records.service.ts';
import { SearchDto } from './search.dto.ts';

@ApiTags('Records')
@Controller('records')
export class RecordsController {
  constructor(
    private readonly recordsService: RecordsService,
    private readonly eventsService: EventsService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search records using the text index, with page-based pagination' })
  async search(@Query() dto: SearchDto) {
    const started = Date.now();
    const result = await this.recordsService.search(dto.q, dto.page, dto.limit, dto.sortBy, dto.sortOrder);
    await this.eventsService.publishApiAction('RECORDS_SEARCHED', {
      query: dto.q ?? '',
      page: result.page,
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
