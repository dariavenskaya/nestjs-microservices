import { Module } from '@nestjs/common';
import { EventsSubscriber } from './events.subscriber';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  providers: [EventsSubscriber],
})
export class EventsModule {}
