import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MessagingService } from '../../../lib/messaging/messaging.service';
import { RedisService } from '../../../lib/redis/redis.service';

export const SERVICE_A_EVENTS = 'service-a.events';

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
    const duration = typeof data.duration === 'number' ? data.duration : 1;
    const timeseriesKey = `api_action:${action}`;

    await this.messaging.publish(SERVICE_A_EVENTS, {
      event: action,
      data,
      timestamp,
      service: 'service-a',
      correlationId,
    });

    try {
      await this.redis.timeseriesCreate(timeseriesKey, 86_400_000 * 30, { service: 'service-a', action });
    } catch (error) {
      this.logger.warn(`Time series create skipped for ${action}: ${error instanceof Error ? error.message : error}`);
    }

    try {
      await this.redis.timeseriesAdd(timeseriesKey, timestamp, duration);
    } catch (error) {
      this.logger.error(`Time series add failed for ${action}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
