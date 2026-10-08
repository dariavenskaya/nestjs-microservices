import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module';
import { MongoModule } from '../../lib/mongo/mongo.module';
import { RedisModule } from '../../lib/redis/redis.module';
import { DataModule } from './data/data.module';
import { RecordsModule } from './records/records.module';

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
