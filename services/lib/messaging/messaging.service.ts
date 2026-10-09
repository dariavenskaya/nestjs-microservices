import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createClient, RedisClientType } from "redis";

export interface MessagePayload {
  event: string;
  data: any;
  timestamp: number;
  service: string;
  correlationId?: string;
}

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private publisher?: RedisClientType;
  private subscriber?: RedisClientType;

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not set");
    }
    this.publisher = createClient({ url }) as RedisClientType;
    this.subscriber = createClient({ url }) as RedisClientType;
    this.publisher.on("error", (error: Error) => console.error(error.message));
    this.subscriber.on("error", (error: Error) => console.error(error.message));

    await this.publisher.connect();
    await this.subscriber.connect();
    console.log("Messaging service initialized");
  }

  async onModuleDestroy() {
    await this.quit(this.publisher);
    await this.quit(this.subscriber);
    console.log("Messaging service disconnected");
  }

  async publish(channel: string, payload: MessagePayload): Promise<void> {
    if (!this.publisher?.isOpen) {
      throw new Error("Messaging publisher is not connected");
    }
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe(
    channel: string,
    callback: (payload: MessagePayload) => void
  ): Promise<void> {
    if (!this.subscriber?.isOpen) {
      throw new Error("Messaging subscriber is not connected");
    }
    await this.subscriber.subscribe(channel, (message) => {
      try {
        const payload = JSON.parse(message) as MessagePayload;
        callback(payload);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });
  }

  private async quit(client?: RedisClientType): Promise<void> {
    if (client?.isOpen) {
      await client.quit();
    }
  }
}
