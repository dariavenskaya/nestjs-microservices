import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { type Collection, type Db, type Document, MongoClient } from "mongodb";

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);
  private client?: MongoClient;

  async onModuleInit(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }

    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
    await this.client.connect();
    this.logger.log("Connected to MongoDB");
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  get db(): Db {
    if (!this.client) {
      throw new Error("MongoDB client is not connected");
    }

    return this.client.db();
  }

  getCollection<T extends Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error("MongoDB client is not connected");
    }

    return this.client;
  }
}
