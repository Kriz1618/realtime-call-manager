import type { Call } from '../domain/call';
import { InvalidQueryError } from '../domain/errors';
import type { CallRepository, CallSortField, SortOrder } from '../domain/ports/call.repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListCallsInput {
  page?: number;
  pageSize?: number;
  search?: string;
  agent?: string;
  isSpam?: boolean;
  isRepeatCaller?: boolean;
  from?: Date;
  to?: Date;
  sortBy?: CallSortField;
  order?: SortOrder;
}

export interface ListCallsResult {
  items: Call[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListCalls {
  constructor(private readonly calls: CallRepository) {}

  async execute(input: ListCallsInput): Promise<ListCallsResult> {
    if (input.from && input.to && input.from > input.to) {
      throw new InvalidQueryError('"from" must not be after "to"');
    }

    const page = input.page ?? 1;
    const pageSize = Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    // Stored numbers are E.164, so spaces or dashes typed by the user must not break the match.
    const search = input.search?.replace(/[^\d+]/g, '') || undefined;

    const { items, total } = await this.calls.list({
      page,
      pageSize,
      search,
      agent: input.agent?.trim() || undefined,
      isSpam: input.isSpam,
      isRepeatCaller: input.isRepeatCaller,
      from: input.from,
      to: input.to,
      sortBy: input.sortBy ?? 'receivedAt',
      order: input.order ?? 'desc',
    });

    return { items, total, page, pageSize };
  }
}
