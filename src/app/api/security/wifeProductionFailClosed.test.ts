/**
 * WIFE-006 — production fail-closed when Redis/Supabase stores unavailable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeRedisRest.ts', () => ({
  wifeRedisJson: vi.fn(),
}));

import { wifeRedisJson } from './wifeRedisRest.ts';
import { consumeRateLimitSlot, resetWifeRateLimitStoreForTests } from './wifeRateLimitStore.ts';
import {
  issueCsrfTokenForSubject,
  resetCsrfServerStoreForTests,
} from './csrfServerStore.ts';

const originalNodeEnv = process.env.NODE_ENV;

describe('WIFE production fail-closed (WIFE-006)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.WIFE_REDIS_REST_URL = 'https://redis.example';
    process.env.WIFE_REDIS_REST_TOKEN = 'token';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetWifeRateLimitStoreForTests();
    resetCsrfServerStoreForTests();
    vi.mocked(wifeRedisJson).mockRejectedValue(new Error('redis down'));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    resetWifeRateLimitStoreForTests();
    resetCsrfServerStoreForTests();
    vi.clearAllMocks();
  });

  it('blocks rate limit when Redis errors in production (no memory fallback)', async () => {
    expect(await consumeRateLimitSlot('subject-prod', { maxRequests: 100 })).toBe(false);
  });

  it('blocks CSRF issue when Redis errors and Supabase absent in production', async () => {
    expect(await issueCsrfTokenForSubject('11111111-2222-4333-8444-555555555555')).toBeNull();
  });

  it('blocks rate limit without Redis env in production', async () => {
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    expect(await consumeRateLimitSlot('no-redis-subject', { maxRequests: 100 })).toBe(false);
  });

  it('blocks CSRF issue without any durable store in production', async () => {
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    expect(await issueCsrfTokenForSubject('no-redis-subject')).toBeNull();
  });
});
