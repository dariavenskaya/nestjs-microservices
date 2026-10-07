import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module.ts';
import { ReportsController } from './reports.controller.ts';
import { ReportsService } from './reports.service.ts';

@Module({
  imports: [LogsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
