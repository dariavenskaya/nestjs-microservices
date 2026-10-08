import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessagingService } from '../../../lib/messaging/messaging.service';
import { LogsService } from '../logs/logs.service';

const SERVICE_A_EVENTS = 'service-a.events';

@Injectable()
export class EventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(EventsSubscriber.name);

  constructor(
    private readonly messaging: MessagingService,
    private readonly logsService: LogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.messaging.subscribe(SERVICE_A_EVENTS, (payload) => {
      void this.logsService.create(payload).catch((error: unknown) => {
        this.logger.error(`Failed to store ${payload.event}`, error instanceof Error ? error.stack : undefined);
      });
    });
    this.logger.log(`Subscribed to ${SERVICE_A_EVENTS}`);
  }
}
