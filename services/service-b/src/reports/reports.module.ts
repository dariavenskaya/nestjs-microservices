import { Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [LogsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
