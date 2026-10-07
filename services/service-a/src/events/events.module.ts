import { Module } from '@nestjs/common';
import { EventsService } from './events.service.ts';

@Module({
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
