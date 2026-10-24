import { config } from 'dotenv';
import type { ConfigService } from '@nestjs/config';
import { Call, NewCallInput } from '../domain/call';
import { PhoneNumber } from '../domain/phone-number';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PrismaCallRepository } from './prisma-call.repository';

config({ path: '../../.env', quiet: true });

const TEST_PREFIX = 'it-';
const phone = '+573001234567';

const input = (callId: string): NewCallInput => ({
  callId,
  phoneNumber: phone,
  agent: 'agente-07',
  durationSeconds: 185,
  recordingUrl: 'https://grabaciones.ejemplo.com/a.mp3',
});

describe('PrismaCallRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: PrismaCallRepository;

  beforeAll(async () => {
    const configService = { getOrThrow: () => process.env.DATABASE_URL } as unknown as ConfigService;
    prisma = new PrismaService(configService);
    await prisma.onModuleInit();
    repository = new PrismaCallRepository(prisma);
  });

  // Only rows created by this suite are removed; development data is untouched.
  const cleanup = () => prisma.call.deleteMany({ where: { callId: { startsWith: TEST_PREFIX } } });

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
    await prisma.onModuleDestroy();
  });

  it('inserts once and returns the stored call on a second insert', async () => {
    const now = new Date('2026-10-23T12:00:00Z');
    const first = await repository.insertIfAbsent(Call.create(input('it-1'), 0, now));
    const second = await repository.insertIfAbsent(Call.create(input('it-1'), 0, now));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.call.id).toBe(first.call.id);
    expect(await prisma.call.count({ where: { callId: 'it-1' } })).toBe(1);
  });

  it('creates exactly one row when identical inserts race', async () => {
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        repository.insertIfAbsent(Call.create(input('it-race'), 0, now)),
      ),
    );

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.call.id)).size).toBe(1);
    expect(await prisma.call.count({ where: { callId: 'it-race' } })).toBe(1);
  });

  it('counts only earlier calls from the same number', async () => {
    await repository.insertIfAbsent(Call.create(input('it-a'), 0, new Date('2026-10-23T10:00:00Z')));
    await repository.insertIfAbsent(Call.create(input('it-b'), 1, new Date('2026-10-23T11:00:00Z')));

    const before = new Date('2026-10-23T10:30:00Z');
    expect(await repository.countByPhoneNumberBefore(PhoneNumber.create(phone), before)).toBeGreaterThanOrEqual(1);

    const strictlyBefore = new Date('2026-10-23T10:00:00Z');
    const other = PhoneNumber.create('+573109998877');
    expect(await repository.countByPhoneNumberBefore(other, strictlyBefore)).toBe(0);
  });

  it('round-trips a call through the database', async () => {
    const original = Call.create(input('it-roundtrip'), 2, new Date('2026-10-23T12:00:00Z'));
    await repository.insertIfAbsent(original);

    const found = await repository.findByCallId('it-roundtrip');

    expect(found?.isRepeatCaller).toBe(true);
    expect(found?.phoneNumber.value).toBe(phone);
    expect(found?.toProps().receivedAt).toEqual(original.toProps().receivedAt);
  });
});
