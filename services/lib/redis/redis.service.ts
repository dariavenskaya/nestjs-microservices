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

  async timeseriesCreate(key: string, retentionMs?: number, labels?: Record<string, string>): Promise<void> {
    const args = ['TS.CREATE', key];
    if (retentionMs) {
      args.push('RETENTION', String(retentionMs));
    }
    if (labels) {
      args.push('LABELS', ...Object.entries(labels).flat());
    }

    try {
      await this.getClient().sendCommand(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already exists') || message.includes('BUSYKEY')) {
        return;
      }
      throw error;
    }
  }

  async timeseriesAdd(key: string, timestamp: number, value: number): Promise<void> {
    await this.getClient().sendCommand(['TS.ADD', key, String(timestamp), String(value)]);
  }

  async timeseriesRange(key: string, from: number, to: number): Promise<Array<[number, number]>> {
    const reply: unknown = await this.getClient().sendCommand(['TS.RANGE', key, String(from), String(to)]);
    if (!Array.isArray(reply)) {
      return [];
    }
    return reply.flatMap((point) => {
      if (!Array.isArray(point) || point.length < 2) {
        return [];
      }
      const timestamp = Number(point[0]);
      const value = Number(point[1]);
      return Number.isFinite(timestamp) && Number.isFinite(value) ? [[timestamp, value] as [number, number]] : [];
    });
  }
}
