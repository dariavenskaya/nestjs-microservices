import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Document, MongoBulkWriteError, ObjectId } from 'mongodb';
import { MongoService } from '../../../lib/mongo/mongo.service';

@Injectable()
export class RecordsService implements OnModuleInit {
  private readonly logger = new Logger(RecordsService.name);
  private readonly collectionName = 'records';

  constructor(private readonly mongo: MongoService) {}

  async onModuleInit(): Promise<void> {
    const collection = this.mongo.getCollection(this.collectionName);
    await collection.createIndex({ createdAt: -1, _id: -1 });
    await collection.createIndex({ '$**': 'text' });
  }

  async insertRecords(
    records: Array<Record<string, unknown>>,
    sourceFile: string,
  ): Promise<number> {
    const collection = this.mongo.getCollection(this.collectionName);
    const documents = records.map((record) => ({
      ...record,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceFile,
    }));

    let inserted = 0;
    for (let offset = 0; offset < documents.length; offset += 1000) {
      const batch = documents.slice(offset, offset + 1000);
      try {
        const result = await collection.insertMany(batch, { ordered: false });
        inserted += result.insertedCount;
      } catch (error) {
        if (!(error instanceof MongoBulkWriteError)) {
          throw error;
        }
        inserted += error.result.insertedCount;
        this.logger.warn(
          `Batch insert skipped ${batch.length - error.result.insertedCount} documents`,
        );
      }
    }
    this.logger.log(`Inserted ${inserted} records from ${sourceFile}`);
    return inserted;
  }

  async search(
    query?: string,
    cursor?: string,
    limit = 10,
  ): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    limit: number;
    nextCursor: string | null;
  }> {
    const collection = this.mongo.getCollection<RecordDocument>(
      this.collectionName,
    );
    const match = query ? { $text: { $search: query } } : {};
    const position = cursor ? this.cursorFilter(cursor) : {};
    const filter = combineFilters(match, position);
    const [rows, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .toArray(),
      collection.countDocuments(match),
    ]);
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor(last.createdAt, last._id) : null;
    return { data, total, limit, nextCursor };
  }

  async getById(id: string): Promise<Record<string, unknown>> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId format');
    }
    const record = await this.mongo
      .getCollection(this.collectionName)
      .findOne({ _id: new ObjectId(id) });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    return record;
  }

  private cursorFilter(cursor: string): Record<string, unknown> {
    const { createdAt, id } = decodeCursor(cursor);
    return {
      $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }],
    };
  }
}

interface RecordDocument extends Document {
  _id: ObjectId;
  createdAt: Date;
}

function combineFilters(
  match: Record<string, unknown>,
  position: Record<string, unknown>,
): Record<string, unknown> {
  const parts = [match, position].filter(
    (part) => Object.keys(part).length > 0,
  );
  if (parts.length === 0) {
    return {};
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return { $and: parts };
}

function encodeCursor(createdAt: Date, id: ObjectId): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: createdAt.toISOString(),
      id: id.toHexString(),
    }),
  ).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: ObjectId } {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (!isCursorPayload(parsed) || !ObjectId.isValid(parsed.id)) {
      throw new Error('invalid');
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('invalid');
    }
    return { createdAt, id: new ObjectId(parsed.id) };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

function isCursorPayload(
  value: unknown,
): value is { createdAt: string; id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'createdAt' in value &&
    'id' in value &&
    typeof value.createdAt === 'string' &&
    typeof value.id === 'string'
  );
}
