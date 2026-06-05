import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health endpoints', () => {
    it('/healthz (GET) should return 200', () => {
      return request(app.getHttpServer())
        .get('/healthz')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });

    it('/readyz (GET) should return 200 or 503', () => {
      return request(app.getHttpServer())
        .get('/readyz')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
    });
  });
});
