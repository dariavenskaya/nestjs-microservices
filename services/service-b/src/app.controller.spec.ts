import { Test, TestingModule } from '@nestjs/testing';
import { MongoService } from '../../lib/mongo/mongo.service.js';
import { RedisService } from '../../lib/redis/redis.service.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: MongoService, useValue: { ping: async () => undefined } },
        { provide: RedisService, useValue: { ping: async () => 'PONG' } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
