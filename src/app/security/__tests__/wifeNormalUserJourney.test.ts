/**
 * عقد المستخدم الاعتيادي لـ WIFE — رحلة استخدام لا هجوم.
 * يمرّر الطلب الموقّع، ويرفض غير الموقّع / المعاد / المعدَّل، ويطابق توقيع العميل للخادم.
 */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/security/stolenTokenServer.ts', () => ({
  detectStolenTokenServer: vi.fn().mockResolvedValue({ status: 'valid' }),
  registerTokenSessionServer: vi.fn().mockResolvedValue(true),
  extractDeviceIdFromRequest: vi.fn().mockReturnValue('userdevice0000000001'),
  isValidWifeDeviceId: vi.fn().mockReturnValue(true),
}));

vi.mock('@/app/api/security/wifeRateLimitStore.ts', () => ({
  consumeRateLimitSlot: vi.fn().mockResolvedValue(true),
  resetWifeRateLimitStoreForTests: vi.fn(),
}));

import { requireWifeUser } from '@/app/api/security/bffAuth.ts';
import { resetNonceStoreForTests } from '@/app/api/security/wifeNonceStore.ts';
import { resetWifeValidatorCachesForTests, verifyWifeSignature } from '@/app/api/security/wifeValidator.ts';
import { RequestSigningService } from '@/app/services/RequestSigningService.ts';
import { GET as csrfGet } from '@/app/api/security/csrf/route.ts';
import { GET as wifeSessionGet } from '@/app/api/security/wife-session/route.ts';
import { GET as healthzGet } from '@/app/api/public/healthz/route.ts';
import { okJson } from './wifeRedTeamHelpers.ts';
import {
  issueCsrfTokenForSubject,
  resetCsrfServerStoreForTests,
} from '@/app/api/security/csrfServerStore.ts';

const TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
const USER_ID = 'normal-lawyer-user-1';
let CSRF = 'NormalUserCsrfTokenValue12';

function csrfPair(): { 'x-csrf-token': string; cookie: string } {
  return {
    'x-csrf-token': CSRF,
    cookie: `hami_csrf_token=${encodeURIComponent(CSRF)}`,
  };
}

async function signedFetchInit(input: {
  method: 'GET' | 'POST';
  url: string;
  body?: string;
}): Promise<RequestInit> {
  const body = input.body ?? '';
  const headers = await RequestSigningService.createSignedHeaders(input.method, input.url, body, TOKEN);
  const csrf = csrfPair();
  return {
    method: input.method,
    headers: {
      ...headers,
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      'x-wife-device-id': 'userdevice0000000001',
      'x-csrf-token': csrf['x-csrf-token'],
      cookie: csrf.cookie,
    },
    body: input.method === 'GET' ? undefined : body,
  };
}

describe('مستخدم عادي — عقد WIFE', () => {
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    resetWifeValidatorCachesForTests();
    resetNonceStoreForTests();
    resetCsrfServerStoreForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return okJson({ id: USER_ID });
        if (url.includes('/rest/v1/profiles')) {
          return okJson([{ id: USER_ID, status: 'active', is_banned: false, deleted_at: null }]);
        }
        if (url.includes('/rest/v1/lawyers')) return okJson([]);
        return new Response('not found', { status: 404 });
      }),
    );
    const issued = await issueCsrfTokenForSubject(USER_ID);
    if (issued) CSRF = issued;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('GET موقّع من العميل يمر على الخادم (قراءة يومية)', async () => {
    const url = 'https://app.test/api/forum/status';
    const req = new Request(url, await signedFetchInit({ method: 'GET', url }));
    expect(await verifyWifeSignature(req, TOKEN)).toBe(true);
  });

  it('POST موقّع مع CSRF يمر (كتابة يومية)', async () => {
    const url = 'https://app.test/api/forum/bookmark';
    const body = '{"postId":"p1"}';
    const req = new Request(url, await signedFetchInit({ method: 'POST', url, body }));
    expect(await verifyWifeSignature(req, TOKEN)).toBe(true);
  });

  it('نفس القراءة بلا توقيع تُرفض — المستخدم لا يُمرَّر صدفة', async () => {
    const req = new Request('https://app.test/api/forum/status', {
      method: 'GET',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
    const gate = await requireWifeUser(req);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(403);
  });

  it('إعادة إرسال نفس nonce تُرفض (منع إعادة التشغيل)', async () => {
    const url = 'https://app.test/api/forum/status';
    const init = await signedFetchInit({ method: 'GET', url });
    const first = new Request(url, init);
    expect(await verifyWifeSignature(first, TOKEN)).toBe(true);
    const replay = new Request(url, init);
    expect(await verifyWifeSignature(replay, TOKEN)).toBe(false);
  });

  it('تغيير الجسم بعد التوقيع يُرفض', async () => {
    const url = 'https://app.test/api/forum/bookmark';
    const init = await signedFetchInit({ method: 'POST', url, body: '{"postId":"p1"}' });
    const tampered = new Request(url, { ...init, body: '{"postId":"victim"}' });
    expect(await verifyWifeSignature(tampered, TOKEN)).toBe(false);
  });

  it('POST بلا CSRF يُرفض؛ GET بلا CSRF يمر', async () => {
    const postUrl = 'https://app.test/api/forum/bookmark';
    const postBody = '{"postId":"p1"}';
    const signed = await RequestSigningService.createSignedHeaders('POST', postUrl, postBody, TOKEN);
    const postReq = new Request(postUrl, {
      method: 'POST',
      headers: { ...signed, authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: postBody,
    });
    expect(await verifyWifeSignature(postReq, TOKEN)).toBe(false);

    const getUrl = 'https://app.test/api/forum/status';
    const getSigned = await RequestSigningService.createSignedHeaders('GET', getUrl, '', TOKEN);
    const getReq = new Request(getUrl, {
      method: 'GET',
      headers: { ...getSigned, authorization: `Bearer ${TOKEN}` },
    });
    expect(await verifyWifeSignature(getReq, TOKEN)).toBe(true);
  });

  it('requireWifeUser يقبل المستخدم الموقّع ويرفض المجهول', async () => {
    const url = 'https://app.test/api/forum/status';
    const okReq = new Request(url, await signedFetchInit({ method: 'GET', url }));
    const ok = await requireWifeUser(okReq);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.userId).toBe(USER_ID);

    const anon = await requireWifeUser(new Request(url, { method: 'GET' }));
    expect(anon.ok).toBe(false);
    if (!anon.ok) expect(anon.response.status).toBe(401);
  });

  it('Bearer مختلف عن كوكي الجلسة يُرفض (لا اختيار صامت)', async () => {
    const url = 'https://app.test/api/forum/status';
    const signed = await signedFetchInit({ method: 'GET', url });
    const headers = new Headers(signed.headers);
    headers.set('cookie', `sb-access-token=${encodeURIComponent('other-session-token-aaaaaaaaaa')}`);
    const req = new Request(url, { method: 'GET', headers });
    const gate = await requireWifeUser(req);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(401);
  });

  it('healthz يبقى متاحاً بلا جلسة؛ wife-session GET لا يصدر سراً', async () => {
    const health = await healthzGet();
    expect(health.status).toBe(200);
    const healthBody = (await health.json()) as { ok?: boolean };
    expect(healthBody.ok).toBe(true);

    const session = await wifeSessionGet(new Request('https://app.test/api/security/wife-session'));
    expect(session.status).toBe(405);
    const sessionBody = (await session.json()) as { sessionSecret?: string; csrfToken?: string };
    expect(sessionBody.sessionSecret).toBeUndefined();
    expect(sessionBody.csrfToken).toBeUndefined();
  });

  it('CSRF بدون توقيع يُرفض للمستخدم غير المصادق', async () => {
    const res = await csrfGet(new Request('https://app.test/api/security/csrf', { method: 'GET' }));
    expect(res.status).toBeGreaterThanOrEqual(401);
    expect(res.status).toBeLessThanOrEqual(403);
  });
});
