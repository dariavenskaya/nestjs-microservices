import { Module } from '@nestjs/common';
import { MongoModule } from '../../lib/mongo/mongo.module.js';
import { RedisModule } from '../../lib/redis/redis.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [MongoModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
