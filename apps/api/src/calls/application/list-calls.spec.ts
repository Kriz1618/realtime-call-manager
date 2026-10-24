import type { CallListCriteria, CallRepository } from '../domain/ports/call.repository';
import { InvalidQueryError } from '../domain/errors';
import { ListCalls } from './list-calls';

function setup() {
  let received: CallListCriteria | undefined;
  const repository = {
    list: async (criteria: CallListCriteria) => {
      received = criteria;
      return { items: [], total: 0 };
    },
  } as unknown as CallRepository;
  return { useCase: new ListCalls(repository), criteria: () => received as CallListCriteria };
}

describe('ListCalls', () => {
  it('applies defaults: page 1, 20 items, newest first', async () => {
    const { useCase, criteria } = setup();

    const result = await useCase.execute({});

    expect(result).toMatchObject({ page: 1, pageSize: 20 });
    expect(criteria()).toMatchObject({ sortBy: 'receivedAt', order: 'desc' });
  });

  it('caps the page size at 100', async () => {
    const { useCase } = setup();
    expect((await useCase.execute({ pageSize: 5000 })).pageSize).toBe(100);
  });

  it('strips formatting from the phone search', async () => {
    const { useCase, criteria } = setup();
    await useCase.execute({ search: '+57 (300) 123-4' });
    expect(criteria().search).toBe('+573001234');
  });

  it('drops blank filters', async () => {
    const { useCase, criteria } = setup();
    await useCase.execute({ search: ' ', agent: '  ' });
    expect(criteria()).toMatchObject({ search: undefined, agent: undefined });
  });

  it('rejects a reversed date range', async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute({ from: new Date('2026-10-02'), to: new Date('2026-10-01') }),
    ).rejects.toThrow(InvalidQueryError);
  });
});
