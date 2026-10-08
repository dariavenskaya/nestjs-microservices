import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongoError } from 'mongodb';
import { MongoService } from '../../../lib/mongo/mongo.service';
import { MessagePayload } from '../../../lib/messaging/messaging.service';

export interface EventLog {
  _id?: unknown;
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
  private readonly MONGO_DUPLICATE_KEY_CODE = 11000;
  private readonly MAX_SERIES_LIMIT = 5000;

  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.getCollection<EventLog>(this.collectionName);
  }

  async onModuleInit(): Promise<void> {
    const collection = this.collection;
    // Составные индексы под реальные паттерны запросов (фильтр + сортировка)
    await collection.createIndex({ event: 1, timestamp: -1 });
    await collection.createIndex({ service: 1, timestamp: -1 });
    await collection.createIndex(
      { correlationId: 1 },
      { unique: true, sparse: true },
    );
  }

  async create(payload: MessagePayload): Promise<void> {
    try {
      await this.collection.insertOne({
        event: payload.event,
        data: payload.data ?? {},
        timestamp: payload.timestamp,
        service: payload.service,
        correlationId: payload.correlationId,
        createdAt: new Date(),
      });
    } catch (error) {
      if (
        error instanceof MongoError &&
        error.code === this.MONGO_DUPLICATE_KEY_CODE
      ) {
        this.logger.warn(`Duplicate event ${payload.correlationId} skipped`);
        return;
      }
      throw error;
    }
  }

  async query(
    type?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: EventLog[]; total: number; page: number; limit: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
    if (type) {
      filter.event = type;
    }

    const dateFilter = this.buildDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      filter.timestamp = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { data, total, page: safePage, limit: safeLimit };
  }

  async series(
    startDate: string,
    endDate: string,
    type?: string,
  ): Promise<EventLog[]> {
    const dateFilter = this.buildDateRangeFilter(startDate, endDate);
    if (!dateFilter) {
      throw new Error('Invalid or missing date range for series query');
    }

    const filter: Record<string, unknown> = { timestamp: dateFilter };
    if (type) {
      filter.event = type;
    }

    return this.collection
      .find(filter)
      .sort({ timestamp: 1 })
      .limit(this.MAX_SERIES_LIMIT)
      .toArray();
  }

  private buildDateRangeFilter(
    startDate?: string,
    endDate?: string,
  ): Record<string, number> | null {
    const timestamp: Record<string, number> = {};

    if (startDate) {
      timestamp.$gte = parseDate(startDate, 'startDate');
    }

    if (endDate) {
      const endMs = parseDate(endDate, 'endDate');
      const isDateOnly = endDate.length === 10 && !endDate.includes('T');
      timestamp.$lte = isDateOnly ? endMs + 86_400_000 - 1 : endMs;
    }

    return Object.keys(timestamp).length > 0 ? timestamp : null;
  }
}

function parseDate(value: string, field: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) {
    throw new BadRequestException(`${field} must be a date in YYYY-MM-DD form`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const isRealDay =
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
  if (!isRealDay) {
    throw new BadRequestException(`${field} must be a valid calendar date`);
  }

  if (!value.includes('T')) {
    return utc.getTime();
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return timestamp;
}
