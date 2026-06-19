import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  issueCsrfTokenForSubject,
  invalidateCsrfForSubject,
  resetCsrfServerStoreForTests,
  validateCsrfForSubject,
} from './csrfServerStore.ts';

describe('csrfServerStore', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetCsrfServerStoreForTests();
  });

  afterEach(() => {
    resetCsrfServerStoreForTests();
  });

  it('issues and validates CSRF token for subject in memory (non-production)', async () => {
    const token = await issueCsrfTokenForSubject('user-sub-1');
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token!.length).toBeGreaterThanOrEqual(16);

    const valid = await validateCsrfForSubject('user-sub-1', token!);
    expect(valid).toBe(true);
  });

  it('rejects wrong token for subject', async () => {
    await issueCsrfTokenForSubject('user-sub-2');
    const valid = await validateCsrfForSubject('user-sub-2', 'wrong-token-value-abc');
    expect(valid).toBe(false);
  });

  it('rotates token on re-issue', async () => {
    const first = await issueCsrfTokenForSubject('user-sub-3');
    const second = await issueCsrfTokenForSubject('user-sub-3');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    const oldValid = await validateCsrfForSubject('user-sub-3', first!);
    const newValid = await validateCsrfForSubject('user-sub-3', second!);
    expect(oldValid).toBe(false);
    expect(newValid).toBe(true);
  });

  it('invalidates token on logout', async () => {
    const token = await issueCsrfTokenForSubject('user-sub-logout');
    expect(await validateCsrfForSubject('user-sub-logout', token!)).toBe(true);
    await invalidateCsrfForSubject('user-sub-logout');
    expect(await validateCsrfForSubject('user-sub-logout', token!)).toBe(false);
  });
});
