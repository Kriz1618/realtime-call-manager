import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/shared/redis/redis.module';


const payload = (callId: string, overrides: Record<string, unknown> = {}) => ({
  callId,
  phoneNumber: '+573001234567',
  agent: 'agente-07',
  durationSeconds: 185,
  recordingUrl: 'https://grabaciones.ejemplo.com/c-10234.mp3',
  ...overrides,
});

describe('POST /webhooks/calls (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let secret: string;

  const post = (body: unknown, withSecret: string | null = secret) => {
    const req = request(app.getHttpServer()).post('/webhooks/calls');
    if (withSecret !== null) req.set('X-Webhook-Secret', withSecret);
    return req.send(body as object);
  };

  const cleanup = async () => {
    await prisma.call.deleteMany();
    await redis.flushdb();
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
    redis = app.get<Redis>(REDIS_CLIENT);
    secret = app.get(ConfigService).getOrThrow<string>('WEBHOOK_SECRET');
  });

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('creates the call and answers 201', async () => {
    const res = await post(payload('e2e-1')).expect(201);

    expect(res.body.duplicated).toBe(false);
    expect(res.body.call).toMatchObject({ callId: 'e2e-1', isSpam: false, isRepeatCaller: false });
  });

  it('answers 200 with the same call when the event arrives twice, storing one row', async () => {
    const first = await post(payload('e2e-2')).expect(201);
    const second = await post(payload('e2e-2')).expect(200);

    expect(second.body.duplicated).toBe(true);
    expect(second.body.call.id).toBe(first.body.call.id);
    expect(await prisma.call.count({ where: { callId: 'e2e-2' } })).toBe(1);
  });

  it('stores a single row when 10 identical events arrive at once', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => post(payload('e2e-race'))),
    );

    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 200)).toHaveLength(9);
    expect(await prisma.call.count({ where: { callId: 'e2e-race' } })).toBe(1);
  });

  it('stays correct when the redis key is lost between deliveries', async () => {
    await post(payload('e2e-lost')).expect(201);
    await redis.del('idempotency:call:e2e-lost');

    await post(payload('e2e-lost')).expect(200);
    expect(await prisma.call.count({ where: { callId: 'e2e-lost' } })).toBe(1);
  });

  it('flags the second call from the same number as a repeat caller', async () => {
    const phoneNumber = '+573109998877';
    await post(payload('e2e-rep-1', { phoneNumber })).expect(201);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await post(payload('e2e-rep-2', { phoneNumber: '+57 310 999 8877' })).expect(201);

    expect(res.body.call.isRepeatCaller).toBe(true);
    expect(res.body.call.previousCallsCount).toBe(1);
  });

  it('rejects a missing or wrong secret with 401 and stores nothing', async () => {
    await post(payload('e2e-auth'), null).expect(401);
    await post(payload('e2e-auth'), 'wrong').expect(401);

    expect(await prisma.call.count({ where: { callId: 'e2e-auth' } })).toBe(0);
  });

  it.each([
    ['negative duration', { durationSeconds: -1 }],
    ['invalid recording url', { recordingUrl: 'not a url' }],
    ['missing agent', { agent: '' }],
  ])('rejects %s with 400', async (_label, overrides) => {
    await post(payload('e2e-bad', overrides)).expect(400);
    expect(await prisma.call.count({ where: { callId: 'e2e-bad' } })).toBe(0);
  });

  it('maps a domain error (invalid phone number) to 400', async () => {
    const res = await post(payload('e2e-phone', { phoneNumber: '123' })).expect(400);
    expect(res.body.error).toBe('InvalidPhoneNumberError');
  });
});
