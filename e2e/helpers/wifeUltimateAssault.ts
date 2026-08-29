import type { APIRequestContext } from '@playwright/test';
import catalog from '../fixtures/wife-protected-routes.json';
import {
  ASSAULT_ORIGIN,
  issueLiveCsrf,
  signedJsonPost,
  VICTIM_UUID,
  WIFE_LIVE_GUEST_TOKEN,
  WIFE_LIVE_UUID_TOKEN,
} from './wifeAssaultKit';
import { wifeLiveAuthHeaders, WIFE_LIVE_DEVICE_ID } from './wifeLiveSign';

export type RouteHit = {
  method: string;
  path: string;
  body?: unknown;
};

export const PROTECTED_CATALOG = catalog.protected as RouteHit[];
export const CATALOG_GENERATED = catalog.generated as string;

export function wallOk(status: number): boolean {
  return status >= 401 && status < 500;
}

export async function hitRoute(request: APIRequestContext, hit: RouteHit) {
  const options = hit.body === undefined ? {} : { data: hit.body };
  const m = hit.method.toUpperCase();
  if (m === 'GET') return request.get(hit.path);
  if (m === 'DELETE') return request.delete(hit.path);
  if (m === 'PATCH') return request.patch(hit.path, options);
  if (m === 'PUT') return request.put(hit.path, options);
  return request.post(hit.path, options);
}

export const TRAVERSAL_PATHS = [
  'guest-lawyer-1/../aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/vault/x.pdf',
  'guest-lawyer-1/..%2faaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/vault/x.pdf',
  'guest-lawyer-1/%2e%2e/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/vault/x.pdf',
  'guest-lawyer-1/%252e%252e/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/vault/x.pdf',
  '..%2fguest-lawyer-1/vault/x.pdf',
  'guest-lawyer-1/vault/%2e%2e%2f%2e%2e/etc/passwd',
  'guest-lawyer-1\\..\\aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\\vault\\x.pdf',
  'guest-lawyer-1/%c0%ae%c0%ae/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/vault/x.pdf',
];

export const KV_ESCALATION_PAYLOADS = [
  { action: 'set', key: `user:${VICTIM_UUID}:cases:1`, value: { pwn: true } },
  { action: 'del', key: `user:${VICTIM_UUID}:cases:1` },
  { action: 'delByPrefix', prefix: 'user:' },
  { action: 'listKeysByPrefix', prefix: 'user:' },
  { action: 'set', key: 'community:posts:inject', value: { x: 1 } },
  { action: 'set', key: 'community:reports:forge', value: { x: 1 } },
  { action: 'set', key: 'banned:users:everyone', value: true },
  { action: 'set', key: `follow:${VICTIM_UUID}:guest-lawyer-1`, value: true },
  { action: 'get', key: `notifications_${VICTIM_UUID}` },
  { action: 'set', key: `profile:${VICTIM_UUID}`, value: { admin: true } },
  { action: 'set', key: `vault:docs:${VICTIM_UUID}:secret`, value: {} },
  { action: 'set', key: `hami:push:${VICTIM_UUID}`, value: { token: 'x' } },
];

export const ESCALATION_POSTS: Array<{ path: string; body: Record<string, unknown>; allow: number[] }> = [
  { path: '/api/admin/ban', body: { targetUserId: VICTIM_UUID, is_banned: true }, allow: [401, 403, 404] },
  { path: '/api/admin/role', body: { targetUserId: VICTIM_UUID, role: 'admin' }, allow: [401, 403, 400, 404] },
  { path: '/api/admin/consultations', body: { postId: 'p1' }, allow: [401, 403, 404] },
  { path: '/api/admin/otp/request', body: { deviceFingerprint: WIFE_LIVE_DEVICE_ID }, allow: [401, 403, 404] },
  { path: '/api/admin/otp/verify', body: { code: '000000' }, allow: [401, 403, 400, 404] },
  { path: '/api/admin/otp/dev-unlock', body: { deviceFingerprint: WIFE_LIVE_DEVICE_ID }, allow: [401, 403, 404] },
  { path: '/api/forum/ban', body: { action: 'ban', userId: VICTIM_UUID, userName: 'v', reason: 'x' }, allow: [401, 403, 404] },
  { path: '/api/forum/pin', body: { postId: 'p1', pinned: true }, allow: [401, 403, 400, 404] },
  { path: '/api/forum/lock', body: { postId: 'p1', locked: true }, allow: [401, 403, 400, 404] },
  { path: '/api/forum/reports', body: { reportId: 'r1', action: 'dismiss' }, allow: [401, 403, 400, 404] },
  { path: '/api/laws/clear', body: { law_name: 'قانون التنفيذ', confirm: true }, allow: [401, 403, 404] },
  { path: '/api/laws/add', body: { law_name: 'قانون التنفيذ', article_number: '999', content: 'inject' }, allow: [401, 403, 404] },
  { path: '/api/laws/import-bundle', body: { articles: [{ n: 1 }] }, allow: [401, 403, 400, 404] },
  { path: '/api/notifications/wipe', body: {}, allow: [200, 401, 403, 400] },
  { path: '/api/notifications/merge', body: { items: [{ id: 'n1', title: '<script>alert(1)</script>' }] }, allow: [200, 400, 403] },
  { path: '/api/case-share', body: { action: 'create', recipientId: VICTIM_UUID, source: { module: 'lawsuit', dossierId: 'x' } }, allow: [400, 403, 404] },
  { path: '/api/account/delete', body: { confirmation: 'WRONG', version: 1 }, allow: [400, 403] },
  { path: '/api/settings/wipe', body: { confirmation: 'WRONG', version: 1 }, allow: [400, 403] },
];

export async function signedPostRaw(
  request: APIRequestContext,
  path: string,
  body: string,
  csrf: string,
  token: string,
  extraHeaders: Record<string, string> = {},
) {
  const headers = await wifeLiveAuthHeaders({
    method: 'POST',
    url: `${ASSAULT_ORIGIN}${path}`,
    body,
    csrf,
    token,
  });
  return request.post(path, { headers: { ...headers, ...extraHeaders }, data: body });
}

export { issueLiveCsrf, signedJsonPost, WIFE_LIVE_GUEST_TOKEN, WIFE_LIVE_UUID_TOKEN };
