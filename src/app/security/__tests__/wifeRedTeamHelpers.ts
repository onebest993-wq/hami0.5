/**
 * Shared helpers for WIFE red-team / destruction drills.
 */
import { vi } from 'vitest';

export const ATTACKER_TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
export const VICTIM_TOKEN = 'other-user-token-abcdefghijklmnopqrstuvwx';
export const ATTACKER_ID = 'attacker-target-user-aaa';
export const VICTIM_ID = 'attacker-victim-user-bbb';
export const CSRF_ATTACKER = 'CsRfTokEnUserA1234567890AbCd';
export const CSRF_VICTIM = 'CsRfTokEnUserB1234567890XyZz';
export const DRILL_DEVICE_ID = 'drilldevice00000001';

export type BffEndpoint = {
  path: string;
  method: 'GET' | 'POST';
  body?: string;
  query?: string;
};

/** Every same-origin BFF route — used for unsigned / tamper flood drills. */
export const ALL_BFF_ENDPOINTS: BffEndpoint[] = [
  { path: '/api/admin/ban', method: 'POST', body: '{"requesterId":"x","targetUserId":"y"}' },
  { path: '/api/admin/verify', method: 'GET' },
  { path: '/api/audit/log', method: 'POST', body: '{"action":"probe"}' },
  { path: '/api/calendar/tombstones', method: 'GET' },
  { path: '/api/calendar/tombstones', method: 'POST', body: '{"action":"mark","eventId":"ev-1"}' },
  { path: '/api/comms-dispatcher', method: 'POST', body: '{"to":"07901234567","message":"spam","channel":"sms"}' },
  { path: '/api/forum/ban', method: 'GET' },
  { path: '/api/forum/ban', method: 'POST', body: '{"action":"ban","userId":"v","userName":"v","reason":"x"}' },
  { path: '/api/forum/bookmark', method: 'GET' },
  { path: '/api/forum/bookmark', method: 'POST', body: '{"postId":"p1"}' },
  { path: '/api/forum/comment', method: 'POST', body: '{"postId":"p1","content":"hi"}' },
  { path: '/api/forum/comment-report', method: 'POST', body: '{"commentId":"c1","reason":"spam"}' },
  { path: '/api/forum/comment-upvote', method: 'POST', body: '{"commentId":"c1"}' },
  { path: '/api/forum/delete', method: 'POST', body: '{"postId":"p1"}' },
  { path: '/api/forum/lock', method: 'POST', body: '{"postId":"p1","locked":true}' },
  { path: '/api/forum/notifications', method: 'GET' },
  { path: '/api/forum/notifications', method: 'POST', body: '{"action":"markRead","ids":["n1"]}' },
  { path: '/api/forum/pin', method: 'POST', body: '{"postId":"p1","pinned":true}' },
  { path: '/api/forum/posts', method: 'GET' },
  { path: '/api/forum/posts', method: 'POST', body: '{"title":"t","content":"c","category":"general"}' },
  { path: '/api/forum/report', method: 'POST', body: '{"postId":"p1","reason":"spam"}' },
  { path: '/api/forum/reports', method: 'GET' },
  { path: '/api/forum/reports', method: 'POST', body: '{"reportId":"r1","action":"dismiss"}' },
  { path: '/api/forum/stats', method: 'GET' },
  { path: '/api/forum/status', method: 'GET' },
  { path: '/api/forum/update', method: 'POST', body: '{"postId":"p1","title":"t"}' },
  { path: '/api/kv-proxy', method: 'POST', body: '{"action":"get","key":"user:victim:cases:1"}' },
  { path: '/api/laws/add', method: 'POST', body: '{"law_name":"قانون التنفيذ","article_number":"1","content":"x"}' },
  { path: '/api/laws/clear', method: 'POST', body: '{"law_name":"قانون التنفيذ","confirm":true}' },
  { path: '/api/laws/list', method: 'POST', body: '{"law_name":"قانون التنفيذ"}' },
  { path: '/api/requests/create', method: 'POST', body: '{"id":"r1","client_id":"c","lawyer_id":"l","title":"t","encrypted_details":"","data_signature":"","status":"open","created_at":"2020-01-01T00:00:00.000Z"}' },
  { path: '/api/requests/list', method: 'POST', body: '{}' },
  { path: '/api/requests/update', method: 'POST', body: '{"id":"r1","status":"closed"}' },
  { path: '/api/security/csrf', method: 'GET' },
  { path: '/api/timeline-events', method: 'GET', query: 'executionFileId=exec-victim-001' },
  { path: '/api/timeline-events', method: 'POST', body: '{"executionFileId":"exec-1","event":{"id":"e1","title":"t"}}' },
  { path: '/api/upload', method: 'POST', body: '{}' },
  { path: '/api/upload/remove', method: 'POST', body: '{"paths":["victim/vault/x.pdf"]}' },
  { path: '/api/upload/signed-url', method: 'POST', body: '{"path":"vault/x.pdf","expiresIn":3600}' },
];

export function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function canonicalPathAndQuery(url: string): string {
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

export async function signWifePayload(input: {
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

export function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature-part`;
}

export function buildEndpointUrl(base: string, ep: BffEndpoint): string {
  const url = new URL(`${base}${ep.path}`);
  if (ep.query) {
    const params = new URLSearchParams(ep.query);
    params.forEach((v, k) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export async function signedRequest(input: {
  url: string;
  method?: 'GET' | 'POST';
  body?: string;
  token?: string;
  nonce?: string;
  timestamp?: string;
  csrf?: string;
  extraHeaders?: Record<string, string>;
  signatureOverride?: string;
}): Promise<Request> {
  const method = input.method ?? 'POST';
  const body = input.body ?? '';
  const timestamp = input.timestamp ?? String(Date.now());
  const nonce = input.nonce ?? `nonce_drill_${Math.random().toString(36).slice(2, 12)}`;
  const token = input.token ?? ATTACKER_TOKEN;
  const signature =
    input.signatureOverride ??
    (await signWifePayload({ method, url: input.url, timestamp, nonce, body, token }));
  const csrf = input.csrf ?? CSRF_ATTACKER;
  return new Request(input.url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-wife-signature': signature,
      'x-wife-timestamp': timestamp,
      'x-wife-nonce': nonce,
      'x-csrf-token': csrf,
      'x-wife-device-id': input.deviceId ?? DRILL_DEVICE_ID,
      cookie: `hami_csrf_token=${encodeURIComponent(csrf)}`,
      ...input.extraHeaders,
    },
    body: method === 'GET' ? undefined : body,
  });
}

export function unsignedRequest(url: string, method: 'GET' | 'POST' = 'POST', body = '{}'): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: `hami_csrf_token=${encodeURIComponent(CSRF_ATTACKER)}`,
    },
    body: method === 'GET' ? undefined : body,
  });
}

export function stubSupabaseAuth(userId: string, profile: Record<string, unknown> | null = null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return okJson({ id: userId });
      if (url.includes('/rest/v1/profiles')) {
        return okJson(profile ? [profile] : []);
      }
      if (url.includes('/rest/v1/lawyers')) return okJson([]);
      return new Response('not found', { status: 404 });
    }),
  );
}

export async function signedPost(input: {
  url: string;
  body: string;
  token?: string;
  nonce?: string;
  timestamp?: string;
  csrf?: string;
  extraHeaders?: Record<string, string>;
  signatureOverride?: string;
}): Promise<Request> {
  return signedRequest({ ...input, method: 'POST' });
}

export function resetWifeDrillEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  delete process.env.WIFE_REDIS_REST_URL;
  delete process.env.WIFE_REDIS_REST_TOKEN;
}
