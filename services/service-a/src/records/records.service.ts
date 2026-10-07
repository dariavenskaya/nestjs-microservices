import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MongoBulkWriteError, ObjectId } from 'mongodb';
import { MongoService } from '../../../lib/mongo/mongo.service.ts';

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);
  private readonly collectionName = 'records';

  constructor(private readonly mongo: MongoService) {}

  async insertRecords(records: Array<Record<string, unknown>>, sourceFile: string): Promise<number> {
    const collection = this.mongo.getCollection(this.collectionName);
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ '$**': 'text' });

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
        this.logger.warn(`Batch insert skipped ${batch.length - error.result.insertedCount} documents`);
      }
    }
    this.logger.log(`Inserted ${inserted} records from ${sourceFile}`);
    return inserted;
  }

  async search(
    query?: string,
    page = 1,
    limit = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{ data: Array<Record<string, unknown>>; total: number; page: number; limit: number }> {
    const collection = this.mongo.getCollection(this.collectionName);
    const filter = query ? { $text: { $search: query } } : {};
    const sort = { [sortBy || 'createdAt']: sortOrder === 'desc' ? -1 : 1 } as Record<string, 1 | -1>;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray() as Promise<Array<Record<string, unknown>>>,
      collection.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async getById(id: string): Promise<Record<string, unknown>> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId format');
    }
    const record = await this.mongo.getCollection(this.collectionName).findOne({ _id: new ObjectId(id) });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    return record;
  }
}
