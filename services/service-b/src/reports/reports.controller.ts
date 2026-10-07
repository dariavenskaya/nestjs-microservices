import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ReportQueryDto } from './report-query.dto.ts';
import { ReportsService } from './reports.service.ts';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('pdf')
  @ApiOperation({ summary: 'Generate a PDF report with a labeled chart for each event type' })
  @ApiProduces('application/pdf')
  async pdf(@Query() dto: ReportQueryDto): Promise<StreamableFile> {
    const buffer = await this.reportsService.buildPdf(dto.startDate, dto.endDate, dto.type);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="report.pdf"',
    });
  }
}
