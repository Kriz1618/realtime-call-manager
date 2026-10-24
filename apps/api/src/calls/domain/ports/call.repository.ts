import type { Call } from '../call';
import type { PhoneNumber } from '../phone-number';

export interface InsertResult {
  call: Call;
  /** false when a call with the same callId already existed. */
  created: boolean;
}

export interface CallRepository {
  /** Atomic: relies on the unique constraint, returns the stored call either way. */
  insertIfAbsent(call: Call): Promise<InsertResult>;
  findByCallId(callId: string): Promise<Call | null>;
  countByPhoneNumberBefore(phoneNumber: PhoneNumber, before: Date): Promise<number>;
  list(criteria: CallListCriteria): Promise<CallPage>;
  findById(id: string): Promise<Call | null>;
  updateSpamStatus(call: Call): Promise<void>;
}

export const CALL_REPOSITORY = Symbol('CALL_REPOSITORY');

export type CallSortField = 'receivedAt' | 'durationSeconds';
export type SortOrder = 'asc' | 'desc';

export interface CallListCriteria {
  page: number;
  pageSize: number;
  search?: string;
  agent?: string;
  isSpam?: boolean;
  isRepeatCaller?: boolean;
  from?: Date;
  to?: Date;
  sortBy: CallSortField;
  order: SortOrder;
}

export interface CallPage {
  items: Call[];
  total: number;
}
