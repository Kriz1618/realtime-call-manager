export interface IdempotencyStore {
  /** Resolves true only for the first caller to claim the key. */
  acquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
