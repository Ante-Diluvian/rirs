import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const FRONTEND_ORIGIN = 'http://frontend.test:3000';

describe('Osnovna nastavitev aplikacije', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = FRONTEND_ORIGIN;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health vrne 200 in stanje ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('Swagger je na /docs in opisuje GET /health', async () => {
    await request(app.getHttpServer()).get('/docs').expect(200);

    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const document = res.body as {
      info: { title: string };
      paths: Record<string, unknown>;
    };

    expect(document.info.title).toBe('Librarium API');
    expect(document.paths).toHaveProperty('/health');
  });

  it('CORS dovoli izvor frontenda iz FRONTEND_ORIGIN', () => {
    return request(app.getHttpServer())
      .options('/health')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  });

  it('CORS ne dovoli drugega izvora', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.test');

    expect(res.headers['access-control-allow-origin']).not.toBe(
      'http://evil.test',
    );
  });

  it('neznana pot vrne 404', () => {
    return request(app.getHttpServer()).get('/ne-obstaja').expect(404);
  });
});
