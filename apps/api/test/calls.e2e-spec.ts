import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';

const PHONE_A = '+573001234567';
const PHONE_B = '+573109998877';

const row = (callId: string, overrides: Record<string, unknown>) => ({
  id: randomUUID(),
  callId,
  phoneNumber: PHONE_A,
  agent: 'agente-01',
  durationSeconds: 10,
  recordingUrl: 'https://x.com/a.mp3',
  isSpam: false,
  isRepeatCaller: false,
  previousCallsCount: 0,
  receivedAt: new Date(),
  ...overrides,
});

// 25 recent calls (c-1 oldest ... c-25 newest) plus 2 older ones from another agent and number.
const seed = () => [
  ...Array.from({ length: 25 }, (_, i) => {
    const n = i + 1;
    return row(`c-${n}`, {
      durationSeconds: n * 10,
      receivedAt: new Date(Date.UTC(2026, 9, 1, 0, n)),
      ...(n === 3 ? { isRepeatCaller: true, previousCallsCount: 1 } : {}),
    });
  }),
  row('x-spam', {
    agent: 'agente-99', phoneNumber: PHONE_B, isSpam: true, durationSeconds: 500,
    receivedAt: new Date(Date.UTC(2026, 8, 1, 0, 1)),
  }),
  row('x-b2', {
    agent: 'agente-99', phoneNumber: PHONE_B, durationSeconds: 600,
    receivedAt: new Date(Date.UTC(2026, 8, 1, 0, 2)),
  }),
];

describe('GET /calls (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const get = (query = '') => request(app.getHttpServer()).get(`/calls${query}`);
  const ids = (body: { items: { callId: string }[] }) => body.items.map((c) => c.callId);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.call.deleteMany();
    await prisma.call.createMany({ data: seed() });
  });

  afterAll(async () => {
    await prisma.call.deleteMany();
    await app.close();
  });

  it('returns the first page newest first by default', async () => {
    const { body } = await get().expect(200);

    expect(body).toMatchObject({ total: 27, page: 1, pageSize: 20 });
    expect(body.items).toHaveLength(20);
    expect(body.items[0].callId).toBe('c-25');
  });

  it('returns the remaining rows on the last page', async () => {
    const { body } = await get('?page=2').expect(200);
    expect(body.items).toHaveLength(7);
  });

  it('honours pageSize', async () => {
    const { body } = await get('?pageSize=5').expect(200);
    expect(ids(body)).toEqual(['c-25', 'c-24', 'c-23', 'c-22', 'c-21']);
  });

  it('filters by agent', async () => {
    const { body } = await get('?agent=agente-99').expect(200);
    expect(body.total).toBe(2);
  });

  it('parses isSpam=false as false, not as a truthy string', async () => {
    const spam = await get('?isSpam=true').expect(200);
    const notSpam = await get('?isSpam=false').expect(200);

    expect(ids(spam.body)).toEqual(['x-spam']);
    expect(notSpam.body.total).toBe(26);
  });

  it('filters repeat callers', async () => {
    const { body } = await get('?isRepeatCaller=true').expect(200);
    expect(ids(body)).toEqual(['c-3']);
  });

  it('searches phone numbers by partial match, ignoring formatting', async () => {
    expect((await get('?search=3109').expect(200)).body.total).toBe(2);
    expect((await get('?search=310%20999').expect(200)).body.total).toBe(2);
    expect((await get('?search=300123').expect(200)).body.total).toBe(25);
  });

  it('filters by date range, inclusive', async () => {
    const { body } = await get(
      '?from=2026-10-01T00:10:00Z&to=2026-10-01T00:12:00Z&order=asc',
    ).expect(200);
    expect(ids(body)).toEqual(['c-10', 'c-11', 'c-12']);
  });

  it('sorts by duration in both directions', async () => {
    const asc = await get('?sortBy=durationSeconds&order=asc&pageSize=1').expect(200);
    const desc = await get('?sortBy=durationSeconds&order=desc&pageSize=1').expect(200);

    expect(ids(asc.body)).toEqual(['c-1']);
    expect(ids(desc.body)).toEqual(['x-b2']);
  });

  it.each([
    ['pageSize above the limit', '?pageSize=101'],
    ['page zero', '?page=0'],
    ['unknown sort field', '?sortBy=agent'],
    ['unknown order', '?order=sideways'],
    ['non-boolean isSpam', '?isSpam=maybe'],
    ['malformed date', '?from=yesterday'],
    ['reversed date range', '?from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z'],
  ])('rejects %s with 400', async (_label, query) => {
    await get(query).expect(400);
  });
});
