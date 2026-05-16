import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeNonceStore', () => ({
  consumeNonceWithTtl: vi.fn(),
}));

import { verifyWifeSignature } from './wifeValidator';
import { consumeNonceWithTtl } from './wifeNonceStore';

const TOKEN = 'test-user-token';
const USER_ID = 'user-1';

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

    (consumeNonceWithTtl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

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
  });

  it('accepts a valid signed JSON request', async () => {
    const url = 'https://example.test/api/requests/create?z=2&a=1';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_valid_12345';
    const body = '{"hello":"world"}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
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

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
      },
      body: tamperedBody,
    });

    const valid = await verifyWifeSignature(req, TOKEN);
    expect(valid).toBe(false);
  });

  it('rejects replay when nonce store reports reused nonce', async () => {
    (consumeNonceWithTtl as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const url = 'https://example.test/api/requests/list';
    const method = 'POST';
    const timestamp = String(Date.now());
    const nonce = 'nonce_replay_12345';
    const body = '{"lawyer_id":"user-1"}';
    const signature = await signWifePayload({ method, url, timestamp, nonce, body, token: TOKEN });

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
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

    const req = new Request(url, {
      method,
      headers: {
        'content-type': 'multipart/form-data; boundary=test-boundary',
        'x-wife-signature': signature,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-wife-content-hash': contentHash,
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
});

