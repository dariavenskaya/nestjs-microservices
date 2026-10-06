import { Controller, Get } from '@nestjs/common';
import { MongoService } from '../../lib/mongo/mongo.service.js';
import { RedisService } from '../../lib/redis/redis.service.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mongoService: MongoService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<{ status: 'ok' }> {
    await this.mongoService.ping();
    await this.redisService.ping();
    return { status: 'ok' };
  }
}
