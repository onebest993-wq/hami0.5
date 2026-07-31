import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeNonceStore.ts', () => ({
  consumeNonceWithTtl: vi.fn(),
}));

vi.mock('./stolenTokenServer.ts', () => ({
  detectStolenTokenServer: vi.fn().mockResolvedValue({ status: 'valid' }),
  registerTokenSessionServer: vi.fn().mockResolvedValue(true),
  extractDeviceIdFromRequest: vi.fn().mockReturnValue(''),
}));

/** Production fail-closes rate limit without Redis; keep slots open so CSRF/device gates are exercised. */
vi.mock('./wifeRateLimitStore.ts', () => ({
  consumeRateLimitSlot: vi.fn().mockResolvedValue(true),
  resetWifeRateLimitStoreForTests: vi.fn(),
}));

import { verifyWifeSignature } from './wifeValidator.ts';
import { consumeNonceWithTtl } from './wifeNonceStore.ts';

/** يجب أن يكون ≥ 20 حرفاً (getVerifiedTokenSubject) */
const TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
const USER_ID = 'user-1';
const CSRF_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

function csrfHeaders(): { 'x-csrf-token': string; cookie: string } {
  return {
    'x-csrf-token': CSRF_TOKEN,
    cookie: `hami_csrf_token=${encodeURIComponent(CSRF_TOKEN)}`,
  };
}

function canonicalPathAndQuery(url: string): string {
  const resolved = new URL(url);
  const normalizedEntries = Array.from(resolved.searchParams.entries()).sort(([ak, av], [bk, bv]) => {
    if (ak === bk) return av.localeCompare(bv);
    return ak.localeCompare(bk);
  });
  const query = new URLSearchParams(normalizedEntries).toString();
  return query ? `${resolved.pathname}?${query}` : resolved.pathname;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function signWifePayload(input: {
  method: string;
  url: string;
  timestamp: string;
  nonce: string;
  body: string;
  token: string;
}): Promise<string> {
  const payload = [
    input.method.toUpperCase(),
    canonicalPathAndQuery(input.url),
    input.timestamp,
    input.nonce,
    input.body,
  ].join('\n');

  const keyMaterial = `${input.token}:wife-sign-v1`;
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial));
  const key = await crypto.subtle.importKey('raw', tokenHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

describe('verifyWifeSignature security checks', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

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
    const url = 'https://example.test/api/requests/create?z=2&a=1';
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
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(true);
  });

  it('rejects tampered JSON body (signature mismatch)', async () => {
    const url = 'https://example.test/api/requests/update';
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
      },
      body: tamperedBody,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects replay when nonce store reports reused nonce', async () => {
    vi.mocked(consumeNonceWithTtl).mockResolvedValue(false);

    const url = 'https://example.test/api/requests/list';
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
      },
      body,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects POST when CSRF header and cookie mismatch', async () => {
    const url = 'https://example.test/api/requests/create';
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

    const url = 'https://example.test/api/requests/create';
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
    const url = 'https://example.test/api/requests/create';
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

  it('accepts multipart request when x-wife-content-hash signature matches', async () => {
    const url = 'https://example.test/api/upload?step=1';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_multi_ok_12345';
    const contentHash = 'a'.repeat(64);
    const signature = await signWifePayload({
      method,
      url,
      timestamp,
      nonce,
      body: contentHash,
      token: TOKEN,
    });
    const csrf = csrfHeaders();

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'multipart/form-data; boundary=test-boundary',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-wife-content-hash': contentHash,
        'x-csrf-token': csrf['x-csrf-token'],
        cookie: csrf.cookie,
      },
      body: '--test-boundary\r\ncontent\r\n--test-boundary--',
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(true);
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

  it('rejects production POST when x-wife-device-id is missing (fail-closed binding)', async () => {
    process.env.NODE_ENV = 'production';
    const { extractDeviceIdFromRequest } = await import('./stolenTokenServer.ts');
    vi.mocked(extractDeviceIdFromRequest).mockReturnValue('');

    const url = 'https://example.test/api/forum/delete';
    const body = '{"postId":"p1"}';
    const timestamp = String(Date.now());
    const nonce = 'nonce_prod_nodevice_1';
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
});
