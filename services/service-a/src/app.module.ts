import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module.ts';
import { MongoModule } from '../../lib/mongo/mongo.module.ts';
import { RedisModule } from '../../lib/redis/redis.module.ts';
import { DataModule } from './data/data.module.ts';
import { RecordsModule } from './records/records.module.ts';

@Module({
  imports: [
    MongoModule,
    RedisModule,
    MessagingModule,
    DataModule,
    RecordsModule,
  ],
})
export class AppModule {}
