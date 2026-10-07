import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module.ts';
import { RecordsModule } from '../records/records.module.ts';
import { DataController } from './data.controller.ts';
import { DataService } from './data.service.ts';

@Module({
  imports: [RecordsModule, EventsModule],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}
