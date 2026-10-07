import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MessagingService } from '../../lib/messaging/messaging.service.ts';
import { MongoService } from '../../lib/mongo/mongo.service.ts';
import { RedisService } from '../../lib/redis/redis.service.ts';
import { EventsSubscriber } from './../src/events/events.subscriber.ts';
import { LogsService } from './../src/logs/logs.service.ts';
import { AppModule } from './../src/app.module.ts';

describe('Logs (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MongoService)
      .useValue({ getClient: async () => ({}) })
      .overrideProvider(RedisService)
      .useValue({ getClient: async () => ({}) })
      .overrideProvider(MessagingService)
      .useValue({
        publish: async () => undefined,
        subscribe: async () => undefined,
      })
      .overrideProvider(LogsService)
      .useValue({
        query: async () => ({ data: [], total: 0, page: 1, limit: 10 }),
      })
      .overrideProvider(EventsSubscriber)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /logs returns a page of event logs', () => {
    return request(app.getHttpServer())
      .get('/logs')
      .expect(200)
      .expect({ data: [], total: 0, page: 1, limit: 10 });
  });

  afterEach(async () => {
    await app.close();
  });
});
