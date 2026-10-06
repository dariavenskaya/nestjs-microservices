import { Module } from '@nestjs/common';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { MongoModule } from '../../lib/mongo/mongo.module.ts';
import { RedisModule } from '../../lib/redis/redis.module.ts';

@Module({
  imports: [MongoModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
