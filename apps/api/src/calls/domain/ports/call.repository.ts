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
}

export const CALL_REPOSITORY = Symbol('CALL_REPOSITORY');
