import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module.ts';
import { MongoModule } from '../../lib/mongo/mongo.module.ts';
import { RedisModule } from '../../lib/redis/redis.module.ts';
import { EventsModule } from './events/events.module.ts';
import { LogsModule } from './logs/logs.module.ts';
import { ReportsModule } from './reports/reports.module.ts';

@Module({
  imports: [
    MongoModule,
    RedisModule,
    MessagingModule,
    LogsModule,
    EventsModule,
    ReportsModule,
  ],
})
export class AppModule {}
