import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: RedisClient;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is not set');
    }

    this.client = createClient({
      url,
      socket: { connectTimeout: 5_000 },
    });
    this.client.on('error', (error: Error) => {
      this.logger.error(error.message);
    });
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  getClient(): RedisClient {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }

    return this.client;
  }

  async ping(): Promise<string> {
    return this.getClient().ping();
  }
}
