import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MessagingService } from '../../../lib/messaging/messaging.service';
import { RedisService } from '../../../lib/redis/redis.service';

export const SERVICE_A_EVENTS = 'service-a.events';
const RETENTION_30_DAYS_MS = 86_400_000 * 30;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly messaging: MessagingService,
    private readonly redis: RedisService,
  ) {}

  async publishApiAction(action: string, data: Record<string, unknown>): Promise<void> {
    const timestamp = Date.now();
    const correlationId = randomUUID();
    const duration = typeof data.duration === 'number' && Number.isFinite(data.duration) ? data.duration : 1;

    await this.messaging.publish(SERVICE_A_EVENTS, {
      event: action,
      data,
      timestamp,
      service: 'service-a',
      correlationId,
    });

    await this.recordTimeSeries(action, timestamp, duration);
  }

  private async recordTimeSeries(action: string, timestamp: number, value: number): Promise<void> {
    const timeseriesKey = `api_action:${action}`;
    try {
      await this.redis.timeseriesAdd(timeseriesKey, timestamp, value);
    } catch (error) {
      if (!isMissingTimeSeries(error)) {
        this.logger.error(`Time series add failed for ${action}: ${errorText(error)}`);
        return;
      }
      try {
        await this.redis.timeseriesCreate(timeseriesKey, RETENTION_30_DAYS_MS, {
          service: 'service-a',
          action,
        });
        await this.redis.timeseriesAdd(timeseriesKey, timestamp, value);
      } catch (createError) {
        this.logger.error(`Time series create failed for ${action}: ${errorText(createError)}`);
      }
    }
  }
}

function isMissingTimeSeries(error: unknown): boolean {
  return errorText(error).includes('the key does not exist');
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
