import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MessagingService } from '../../lib/messaging/messaging.service.ts';
import { MongoService } from '../../lib/mongo/mongo.service.ts';
import { RedisService } from '../../lib/redis/redis.service.ts';
import { AppModule } from './../src/app.module.ts';
import { App } from 'supertest/types.js';

describe('Records (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MongoService)
      .useValue({
        ping: async () => undefined,
        getCollection: () => ({
          find: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  toArray: async () => [{ name: 'Leanne' }],
                }),
              }),
            }),
          }),
          countDocuments: async () => 1,
        }),
      })
      .overrideProvider(RedisService)
      .useValue({
        ping: async () => 'PONG',
        timeseriesCreate: async () => undefined,
        timeseriesAdd: async () => undefined,
      })
      .overrideProvider(MessagingService)
      .useValue({
        publish: async () => undefined,
        subscribe: async () => undefined,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /records/search returns a page of records', () => {
    return request(app.getHttpServer())
      .get('/records/search')
      .expect(200)
      .expect({ data: [{ name: 'Leanne' }], total: 1, page: 1, limit: 10 });
  });

  afterEach(async () => {
    await app.close();
  });
});
