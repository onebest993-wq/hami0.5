// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeNonceStore.ts', () => ({
  consumeNonceWithTtl: vi.fn(),
}));

vi.mock('./stolenTokenServer.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./stolenTokenServer.ts')>();
  return {
    ...actual,
    detectStolenTokenServer: vi.fn().mockResolvedValue({ status: 'valid' }),
    registerTokenSessionServer: vi.fn().mockResolvedValue(true),
  };
});

/** Production fail-closes rate limit without Redis; keep slots open so CSRF/device gates are exercised. */
vi.mock('./wifeRateLimitStore.ts', () => ({
  consumeRateLimitSlot: vi.fn().mockResolvedValue(true),
  resetWifeRateLimitStoreForTests: vi.fn(),
}));

import { verifyWifeSignature, wifeRateLimitedResponse } from './wifeValidator.ts';
import { consumeNonceWithTtl } from './wifeNonceStore.ts';
import { issueCsrfTokenForSubject, resetCsrfServerStoreForTests } from './csrfServerStore.ts';
import { okJson, signWifePayload, DRILL_DEVICE_ID } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';

/** يجب أن يكون ≥ 20 حرفاً (getVerifiedTokenSubject) */
const TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
const USER_ID = 'user-1';
let CSRF_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

function csrfHeaders(): { 'x-csrf-token': string; cookie: string } {
  return {
    'x-csrf-token': CSRF_TOKEN,
    cookie: `hami_csrf_token=${encodeURIComponent(CSRF_TOKEN)}`,
  };
}

function deviceHeader(): Record<string, string> {
  return { 'x-wife-device-id': DRILL_DEVICE_ID };
}

describe('verifyWifeSignature security checks', () => {
  beforeEach(async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    resetCsrfServerStoreForTests();
    const issued = await issueCsrfTokenForSubject(USER_ID);
    if (issued) CSRF_TOKEN = issued;

    vi.mocked(consumeNonceWithTtl).mockResolvedValue(true);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) {
          return okJson({ id: USER_ID });
        }
        if (url.includes('/rest/v1/profiles')) {
          return okJson([{ id: USER_ID, status: 'active', is_banned: false, deleted_at: null }]);
        }
        if (url.includes('/rest/v1/lawyers')) {
          return okJson([]);
        }
        return new Response('not found', { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('accepts a valid signed JSON request', async () => {
    const url = 'https://example.test/api/forum/posts?z=2&a=1';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_valid_12345';
    const body = '{"hello":"world"}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });
    const csrf = csrfHeaders();

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
        ...deviceHeader(),
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(true);
  });

  it('rejects tampered JSON body (signature mismatch)', async () => {
    const url = 'https://example.test/api/forum/update';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_tamper_12345';
    const originalBody = '{"safe":true}';
    const tamperedBody = '{"safe":false}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body: originalBody, token: TOKEN });

    const csrf = csrfHeaders();

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
        ...deviceHeader(),
      },
      body: tamperedBody,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects replay when nonce store reports reused nonce', async () => {
    vi.mocked(consumeNonceWithTtl).mockResolvedValue(false);

    const url = 'https://example.test/api/kv-proxy';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_replay_12345';
    const body = '{"lawyer_id":"user-1"}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });

    const csrf = csrfHeaders();

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
        ...deviceHeader(),
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects POST when CSRF header and cookie mismatch', async () => {
    const url = 'https://example.test/api/forum/posts';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_csrf_mismatch_1';
    const body = '{"x":1}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_TOKEN,
        cookie: 'hami_csrf_token=DifferentTokenValue1234567890',
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects POST when CSRF cookie is missing in production mode', async () => {
    process.env.NODE_ENV = 'production';

    const url = 'https://example.test/api/forum/posts';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_csrf_prod_1';
    const body = '{"x":1}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_TOKEN,
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects malformed header format before verification work', async () => {
    const url = 'https://example.test/api/forum/posts';
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': '***not_base64url***',
        'x-wife-timestamp': String(Date.now()),
        'x-wife-nonce': 'nonce_hdrfmt_12345',
      },
      body: '{"x":1}',
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('accepts multipart request when file bytes match x-wife-content-hash', async () => {
    const url = 'https://example.test/api/upload?step=1';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_multi_ok_12345';
    const fileBytes = new Uint8Array([11, 22, 33, 44]);
    const digest = await crypto.subtle.digest('SHA-256', fileBytes);
    const contentHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signature = await signWifePayload({
      method,
      url,
      timestamp,
      nonce,
      body: contentHash,
      token: TOKEN,
    });
    const csrf = csrfHeaders();
    const form = new FormData();
    form.append('file', new File([fileBytes], 'doc.bin', { type: 'application/octet-stream' }));

    const req = new Request(url, {
      method,
      headers: {
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-wife-content-hash': contentHash,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
        ...deviceHeader(),
      },
      body: form,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(true);
  });

  it('rejects multipart request when file bytes do not match x-wife-content-hash', async () => {
    const url = 'https://example.test/api/upload';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_multi_mismatch_1';
    const claimedBytes = new Uint8Array([1, 2, 3]);
    const actualBytes = new Uint8Array([9, 9, 9]);
    const digest = await crypto.subtle.digest('SHA-256', claimedBytes);
    const contentHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signature = await signWifePayload({
      method,
      url,
      timestamp,
      nonce,
      body: contentHash,
      token: TOKEN,
    });
    const csrf = csrfHeaders();
    const form = new FormData();
    form.append('file', new File([actualBytes], 'doc.bin', { type: 'application/octet-stream' }));

    const req = new Request(url, {
      method,
      headers: {
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-wife-content-hash': contentHash,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
        ...deviceHeader(),
      },
      body: form,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects multipart request when x-wife-content-hash is missing', async () => {
    const url = 'https://example.test/api/upload';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_multi_missing_12345';
    const contentHash = 'b'.repeat(64);
    const signature = await signWifePayload({
      method,
      url,
      timestamp,
      nonce,
      body: contentHash,
      token: TOKEN,
    });

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'multipart/form-data; boundary=test-boundary',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
      },
      body: '--test-boundary\r\ncontent\r\n--test-boundary--',
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects POST when x-wife-device-id is missing', async () => {
    process.env.NODE_ENV = 'test';

    const url = 'https://example.test/api/forum/delete';
    const body = '{"postId":"p1"}';
    const timestamp = String(Date.now());
    const nonce = 'nonce_post_nodevice_1';
    const signature = await signWifePayload({
      method: 'POST',
      url,
      timestamp,
      nonce,
      body,
      token: TOKEN,
    });
    const csrf = csrfHeaders();
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
      },
      body,
    });

    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('rejects GET when x-wife-device-id is missing', async () => {
    process.env.NODE_ENV = 'test';

    const url = 'https://example.test/api/kv-proxy';
    const timestamp = String(Date.now());
    const nonce = 'nonce_get_nodevice_1';
    const signature = await signWifePayload({
      method: 'GET',
      url,
      timestamp,
      nonce,
      body: '',
      token: TOKEN,
    });
    const req = new Request(url, {
      method: 'GET',
      headers: {
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
      },
    });

    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });
});

describe('wifeRateLimitedResponse', () => {
  it('returns readable Arabic 429 copy matching the client', async () => {
    const res = wifeRateLimitedResponse();
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('60');
    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe('WIFE_RATE_LIMITED');
    expect(body.message).toBe('تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.');
  });
});
