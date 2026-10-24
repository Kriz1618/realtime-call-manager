import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/shared/redis/redis.module';

const payload = (callId: string) => ({
  callId,
  phoneNumber: '+573001234567',
  agent: 'agente-07',
  durationSeconds: 10,
  recordingUrl: 'https://x.com/a.mp3',
});

const count = (text: string, needle: string) => text.split(needle).length - 1;

async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function openStream(url: string): Promise<{ text: () => string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (text += chunk));
      res.on('error', () => undefined);
      resolve({ text: () => text, close: () => req.destroy() });
    });
    req.on('error', reject);
  });
}

describe('GET /calls/stream (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let secret: string;
  let streamUrl: string;
  const open: { close: () => void }[] = [];

  const subscribe = async () => {
    const stream = await openStream(streamUrl);
    open.push(stream);
    await waitFor(() => stream.text().includes('event: connected'));
    return stream;
  };
  const sendWebhook = (callId: string) =>
    request(app.getHttpServer())
      .post('/webhooks/calls')
      .set('X-Webhook-Secret', secret)
      .send(payload(callId));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
    redis = app.get<Redis>(REDIS_CLIENT);
    secret = app.get(ConfigService).getOrThrow<string>('WEBHOOK_SECRET');
    const { port } = app.getHttpServer().address() as AddressInfo;
    streamUrl = `http://127.0.0.1:${port}/calls/stream`;
  });

  beforeEach(async () => {
    await prisma.call.deleteMany();
    await redis.flushdb();
  });

  afterEach(() => open.splice(0).forEach((stream) => stream.close()));

  afterAll(async () => {
    await prisma.call.deleteMany();
    await app.close();
  });

  it('pushes call.created to every connected client', async () => {
    const [a, b] = [await subscribe(), await subscribe()];

    await sendWebhook('stream-1').expect(201);

    await waitFor(() => a.text().includes('event: call.created') && b.text().includes('event: call.created'));
    expect(a.text()).toContain('"callId":"stream-1"');
  });

  it('does not push a second event for a duplicated webhook', async () => {
    const stream = await subscribe();

    await sendWebhook('stream-2').expect(201);
    await sendWebhook('stream-2').expect(200);
    await sendWebhook('stream-3').expect(201);

    await waitFor(() => count(stream.text(), 'event: call.created') >= 2);
    expect(count(stream.text(), 'event: call.created')).toBe(2);
  });

  it('pushes call.spam_updated when a call is marked as spam', async () => {
    const stream = await subscribe();
    const { body } = await sendWebhook('stream-4').expect(201);

    await request(app.getHttpServer())
      .patch(`/calls/${body.call.id}/spam`)
      .send({ isSpam: true })
      .expect(200);

    await waitFor(() => stream.text().includes('event: call.spam_updated'));
    expect(stream.text()).toContain('"isSpam":true');
  });
});
