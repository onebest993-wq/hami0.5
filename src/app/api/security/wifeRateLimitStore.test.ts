import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { consumeRateLimitSlot, resetWifeRateLimitStoreForTests } from './wifeRateLimitStore.ts';

describe('wifeRateLimitStore', () => {
  beforeEach(() => {
    resetWifeRateLimitStoreForTests();
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    resetWifeRateLimitStoreForTests();
  });

  it('allows requests under the configured limit', async () => {
    const key = 'subject-a';
    expect(await consumeRateLimitSlot(key, { maxRequests: 3, windowMs: 60_000 })).toBe(true);
    expect(await consumeRateLimitSlot(key, { maxRequests: 3, windowMs: 60_000 })).toBe(true);
    expect(await consumeRateLimitSlot(key, { maxRequests: 3, windowMs: 60_000 })).toBe(true);
  });

  it('blocks requests above the configured limit', async () => {
    const key = 'subject-b';
    expect(await consumeRateLimitSlot(key, { maxRequests: 2, windowMs: 60_000 })).toBe(true);
    expect(await consumeRateLimitSlot(key, { maxRequests: 2, windowMs: 60_000 })).toBe(true);
    expect(await consumeRateLimitSlot(key, { maxRequests: 2, windowMs: 60_000 })).toBe(false);
  });
});
