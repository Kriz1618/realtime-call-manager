import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import type { Call } from '../src/calls/domain/call';
import { CALL_EVENT_PUBLISHER, CallEventPublisher } from '../src/calls/domain/ports/call-event-publisher';
import { PrismaService } from '../src/shared/prisma/prisma.service';

class RecordingPublisher implements CallEventPublisher {
  spam: Call[] = [];
  async callCreated(): Promise<void> {}
  async spamUpdated(call: Call): Promise<void> {
    this.spam.push(call);
  }
}

describe('PATCH /calls/:id/spam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const publisher = new RecordingPublisher();

  const seed = () =>
    prisma.call.create({
      data: {
        callId: 'spam-1',
        phoneNumber: '+573001234567',
        agent: 'agente-07',
        durationSeconds: 10,
        recordingUrl: 'https://x.com/a.mp3',
      },
    });
  const patch = (id: string, body: unknown) =>
    request(app.getHttpServer()).patch(`/calls/${id}/spam`).send(body as object);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CALL_EVENT_PUBLISHER)
      .useValue(publisher)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.call.deleteMany();
    publisher.spam = [];
  });

  afterAll(async () => {
    await prisma.call.deleteMany();
    await app.close();
  });

  it('marks a call as spam, persists it and emits one event', async () => {
    const { id } = await seed();

    const res = await patch(id, { isSpam: true }).expect(200);

    expect(res.body).toMatchObject({ id, isSpam: true });
    expect((await prisma.call.findUnique({ where: { id } }))?.isSpam).toBe(true);
    expect(publisher.spam).toHaveLength(1);
  });

  it('is idempotent: repeating the request emits no new event', async () => {
    const { id } = await seed();

    await patch(id, { isSpam: true }).expect(200);
    await patch(id, { isSpam: true }).expect(200);

    expect(publisher.spam).toHaveLength(1);
  });

  it('unmarks a call', async () => {
    const { id } = await seed();
    await patch(id, { isSpam: true }).expect(200);

    const res = await patch(id, { isSpam: false }).expect(200);

    expect(res.body.isSpam).toBe(false);
    expect(publisher.spam).toHaveLength(2);
  });

  it('answers 404 for an unknown call', async () => {
    await patch(randomUUID(), { isSpam: true }).expect(404);
  });

  it.each([
    ['a malformed id', 'not-a-uuid', { isSpam: true }],
    ['a non-boolean body', randomUUID(), { isSpam: 'yes' }],
    ['a missing body', randomUUID(), {}],
  ])('rejects %s with 400', async (_label, id, body) => {
    await patch(id, body).expect(400);
  });
});
