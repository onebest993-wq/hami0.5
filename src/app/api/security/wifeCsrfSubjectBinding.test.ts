import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  issueCsrfTokenForSubject,
  invalidateCsrfForSubject,
  resetCsrfServerStoreForTests,
} from './csrfServerStore.ts';
import { verifyCsrfToken } from './wifeCsrfVerify.ts';
import { resetWifeTokenSubjectCacheForTests } from './wifeTokenSubject.ts';

const GUEST = 'guest-lawyer-1';
const UUID = '11111111-2222-4333-8444-555555555555';
const GUEST_TOKEN = `dev-access-token-${GUEST}`;
const UUID_TOKEN = `dev-access-token-${UUID}`;

function mutatingReq(token: string, csrf: string, cookieCsrf: string): Request {
  return new Request('https://app.test/api/settings/cloud-sync', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-csrf-token': csrf,
      cookie: `hami_csrf_token=${encodeURIComponent(cookieCsrf)}`,
    },
    body: '{"app_data":{}}',
  });
}

describe('wifeCsrfVerify subject binding (WIFE-009)', () => {
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    resetCsrfServerStoreForTests();
    resetWifeTokenSubjectCacheForTests();
    await issueCsrfTokenForSubject(GUEST);
    await issueCsrfTokenForSubject(UUID);
  });

  afterEach(() => {
    resetCsrfServerStoreForTests();
    resetWifeTokenSubjectCacheForTests();
  });

  it('يرفض CSRF صادر لضيف مع Bearer UUID (cross-subject)', async () => {
    const guestCsrf = (await issueCsrfTokenForSubject(GUEST))!;
    expect(await verifyCsrfToken(mutatingReq(UUID_TOKEN, guestCsrf, guestCsrf), UUID_TOKEN)).toBe(false);
  });

  it('يقبل CSRF المطابق لنفس subject', async () => {
    const guestCsrf = (await issueCsrfTokenForSubject(GUEST))!;
    expect(await verifyCsrfToken(mutatingReq(GUEST_TOKEN, guestCsrf, guestCsrf), GUEST_TOKEN)).toBe(true);
  });

  it('في التطوير: سجل فارغ مع تطابق الكوكي/الرأس يُقبل', async () => {
    resetCsrfServerStoreForTests();
    const csrf = (await issueCsrfTokenForSubject(UUID))!;
    await invalidateCsrfForSubject(UUID);
    expect(await verifyCsrfToken(mutatingReq(UUID_TOKEN, csrf, csrf), UUID_TOKEN)).toBe(true);
  });
});
