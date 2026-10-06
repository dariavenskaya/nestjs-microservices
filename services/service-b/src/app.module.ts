import { Module } from '@nestjs/common';
import { MongoModule } from '../../lib/mongo/mongo.module.ts';
import { RedisModule } from '../../lib/redis/redis.module.ts';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';

@Module({
  imports: [MongoModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
