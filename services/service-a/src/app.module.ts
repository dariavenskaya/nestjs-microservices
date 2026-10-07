import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module.ts';
import { MongoModule } from '../../lib/mongo/mongo.module.ts';
import { RedisModule } from '../../lib/redis/redis.module.ts';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { DataModule } from './data/data.module.ts';
import { RecordsModule } from './records/records.module.ts';

@Module({
  imports: [
    MongoModule,
    RedisModule,
    MessagingModule.forRoot(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'),
    DataModule,
    RecordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
