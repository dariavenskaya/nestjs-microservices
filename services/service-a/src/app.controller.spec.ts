import { Test, TestingModule } from '@nestjs/testing';
import { MongoService } from '../../lib/mongo/mongo.service.ts';
import { RedisService } from '../../lib/redis/redis.service.ts';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';

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
