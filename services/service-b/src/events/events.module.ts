import { Module } from '@nestjs/common';
import { EventsSubscriber } from './events.subscriber.ts';
import { LogsModule } from '../logs/logs.module.ts';

@Module({
  imports: [LogsModule],
  providers: [EventsSubscriber],
})
export class EventsModule {}
