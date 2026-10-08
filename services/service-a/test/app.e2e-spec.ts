import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MessagingService } from '../../lib/messaging/messaging.service';
import { MongoService } from '../../lib/mongo/mongo.service';
import { RedisService } from '../../lib/redis/redis.service';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types.js';

describe('Records (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MongoService)
      .useValue({
        getCollection: () => ({
          find: () => ({
            sort: () => ({
              limit: () => ({
                toArray: async () => [{ name: 'Leanne' }],
              }),
            }),
          }),
          dropIndex: async () => undefined,
          createIndex: async () => undefined,
          countDocuments: async () => 1,
        }),
      })
      .overrideProvider(RedisService)
      .useValue({
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
      .expect({ data: [{ name: 'Leanne' }], total: 1, limit: 10, nextCursor: null });
  });

  afterEach(async () => {
    await app.close();
  });
});
