import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module';
import { MongoModule } from '../../lib/mongo/mongo.module';
import { RedisModule } from '../../lib/redis/redis.module';
import { EventsModule } from './events/events.module';
import { LogsModule } from './logs/logs.module';
import { ReportsModule } from './reports/reports.module';

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
