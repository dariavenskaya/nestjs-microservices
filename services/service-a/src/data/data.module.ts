import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { RecordsModule } from '../records/records.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';

@Module({
  imports: [RecordsModule, EventsModule],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}
