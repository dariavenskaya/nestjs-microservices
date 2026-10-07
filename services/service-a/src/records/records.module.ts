import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module.ts';
import { RecordsController } from './records.controller.ts';
import { RecordsService } from './records.service.ts';

@Module({
  imports: [EventsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
