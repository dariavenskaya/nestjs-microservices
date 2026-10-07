import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongoService } from '../../../lib/mongo/mongo.service.ts';
import { MessagePayload } from '../../../lib/messaging/messaging.service.ts';

export interface EventLog {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  service: string;
  correlationId?: string;
  createdAt: Date;
}

@Injectable()
export class LogsService implements OnModuleInit {
  private readonly logger = new Logger(LogsService.name);
  private readonly collectionName = 'event_logs';

  constructor(private readonly mongo: MongoService) {}

  async onModuleInit(): Promise<void> {
    const collection = this.mongo.getCollection(this.collectionName);
    await collection.dropIndex('eventId_1').catch(() => undefined);
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ event: 1 });
    await collection.createIndex({ service: 1 });
    await collection.createIndex({ correlationId: 1 }, { unique: true, sparse: true });
  }

  async isDuplicate(correlationId?: string): Promise<boolean> {
    if (!correlationId) {
      return false;
    }
    const existing = await this.mongo.getCollection(this.collectionName).findOne({ correlationId });
    return existing !== null;
  }

  async create(payload: MessagePayload): Promise<void> {
    if (await this.isDuplicate(payload.correlationId)) {
      this.logger.warn(`Duplicate event ${payload.correlationId} skipped`);
      return;
    }
    await this.mongo.getCollection<EventLog>(this.collectionName).insertOne({
      event: payload.event,
      data: payload.data ?? {},
      timestamp: payload.timestamp,
      service: payload.service,
      correlationId: payload.correlationId,
      createdAt: new Date(),
    });
  }

  async query(
    type?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: EventLog[]; total: number; page: number; limit: number }> {
    const filter: Record<string, unknown> = {};
    if (type) {
      filter.event = type;
    }
    if (startDate || endDate) {
      const timestamp: Record<string, number> = {};
      if (startDate) {
        timestamp.$gte = new Date(startDate).getTime();
      }
      if (endDate) {
        timestamp.$lte = new Date(endDate).getTime() + 86_400_000 - 1;
      }
      filter.timestamp = timestamp;
    }
    const collection = this.mongo.getCollection<EventLog>(this.collectionName);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      collection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async series(startDate: string, endDate: string, type?: string): Promise<EventLog[]> {
    const filter: Record<string, unknown> = {
      timestamp: {
        $gte: new Date(startDate).getTime(),
        $lte: new Date(endDate).getTime() + 86_400_000 - 1,
      },
    };
    if (type) {
      filter.event = type;
    }
    return this.mongo.getCollection<EventLog>(this.collectionName).find(filter).sort({ timestamp: 1 }).toArray();
  }
}
