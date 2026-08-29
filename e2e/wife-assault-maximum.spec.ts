/**
 * أقصى محاكاة دفاعية حيّة — كتالوج كل المسارات المحمية + تصعيد + بروتوكول.
 * الرفض = نجاح. لا مسح حساب، لا wipe بتأكيد صحيح، لا SMS، لا فيضان شبكة.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { wifeLiveAuthHeaders, WIFE_LIVE_GUEST_TOKEN } from './helpers/wifeLiveSign';

const ORIGIN = 'http://localhost:8080';
const VICTIM = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

type Hit = {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  body?: Record<string, unknown> | string;
};

const UNSIGNED_PROTECTED: Hit[] = [
  { method: 'POST', path: '/api/admin/ban', body: { targetUserId: VICTIM, is_banned: true } },
  { method: 'POST', path: '/api/admin/account', body: { action: 'set_password', targetUserId: VICTIM, password: 'HamiLaw9x' } },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'POST', path: '/api/admin/role', body: { targetUserId: VICTIM, role: 'admin' } },
  { method: 'GET', path: '/api/admin/stats' },
  { method: 'GET', path: '/api/admin/status' },
  { method: 'GET', path: '/api/admin/audit' },
  { method: 'GET', path: '/api/admin/devices' },
  { method: 'POST', path: '/api/admin/devices', body: { action: 'revoke', deviceId: VICTIM } },
  { method: 'GET', path: '/api/admin/consultations' },
  { method: 'POST', path: '/api/admin/consultations', body: { postId: 'p1' } },
  { method: 'GET', path: '/api/admin/verify' },
  { method: 'POST', path: '/api/admin/otp/request', body: { deviceFingerprint: 'x'.repeat(32) } },
  { method: 'GET', path: '/api/admin/otp/csrf' },
  { method: 'POST', path: '/api/admin/otp/verify', body: { code: '000000' } },
  { method: 'POST', path: '/api/admin/otp/dev-unlock', body: { deviceFingerprint: 'x'.repeat(32) } },
  { method: 'POST', path: '/api/audit/log', body: { action: 'FORGED' } },
  { method: 'GET', path: '/api/calendar/tombstones' },
  { method: 'POST', path: '/api/calendar/tombstones', body: { action: 'mark', eventId: 'ev-1' } },
  { method: 'GET', path: '/api/case-share' },
  { method: 'POST', path: '/api/case-share', body: { action: 'create', recipientId: VICTIM } },
  { method: 'GET', path: `/api/case-share/detail?shareId=${VICTIM}` },
  { method: 'POST', path: '/api/account/delete', body: { confirmation: 'DELETE_LAWYER_ACCOUNT_V1', version: 1 } },
  { method: 'POST', path: '/api/settings/wipe', body: { confirmation: 'WIPE_ALL_APPLICATION_DATA_V1', version: 1 } },
  { method: 'GET', path: '/api/settings/cloud-sync' },
  { method: 'POST', path: '/api/settings/cloud-sync', body: { user_key: VICTIM, app_data: { pwn: true } } },
  { method: 'PATCH', path: '/api/settings/cloud-sync', body: { action: 'migrateLegacy' } },
  { method: 'GET', path: '/api/execution-files/list' },
  { method: 'POST', path: '/api/execution-files/delete', body: { external_id: 'victim-exec-1' } },
  { method: 'POST', path: '/api/execution-files/upsert', body: { external_id: 'x', payload: {} } },
  { method: 'GET', path: '/api/lawsuit-files/list' },
  { method: 'POST', path: '/api/lawsuit-files/delete', body: { external_id: 'victim-case-1' } },
  { method: 'POST', path: '/api/lawsuit-files/upsert', body: { external_id: 'x', payload: {} } },
  { method: 'GET', path: '/api/global-notes/list' },
  { method: 'POST', path: '/api/global-notes/delete', body: { id: 'n1' } },
  { method: 'POST', path: '/api/global-notes/upsert', body: { id: 'n1', text: 'x' } },
  { method: 'GET', path: '/api/task-help/list' },
  { method: 'POST', path: '/api/task-help/create', body: { title: 'x' } },
  { method: 'POST', path: '/api/task-help/accept', body: { id: 't1' } },
  { method: 'POST', path: '/api/task-help/complete', body: { id: 't1' } },
  { method: 'POST', path: '/api/task-help/note', body: { id: 't1', note: 'x' } },
  { method: 'GET', path: '/api/notifications/list' },
  { method: 'GET', path: '/api/notifications/health' },
  { method: 'POST', path: '/api/notifications/wipe', body: {} },
  { method: 'POST', path: '/api/notifications/append', body: { item: {} } },
  { method: 'POST', path: '/api/notifications/merge', body: { items: [] } },
  { method: 'POST', path: '/api/notifications/read-state', body: { ids: [] } },
  { method: 'POST', path: '/api/notifications/fcm-register', body: { token: 'fcm' } },
  { method: 'POST', path: '/api/kv-proxy', body: { action: 'get', key: `user:${VICTIM}:cases:1` } },
  { method: 'POST', path: '/api/laws/add', body: { law_name: 'قانون التنفيذ', article_number: '1', content: 'x' } },
  { method: 'POST', path: '/api/laws/clear', body: { law_name: 'قانون التنفيذ', confirm: true } },
  { method: 'POST', path: '/api/laws/list', body: { law_name: 'قانون التنفيذ' } },
  { method: 'POST', path: '/api/laws/import-bundle', body: { bundle: [] } },
  { method: 'GET', path: '/api/security/csrf' },
  { method: 'DELETE', path: '/api/security/wife-session' },
  { method: 'GET', path: `/api/timeline-events?executionFileId=victim-exec-001` },
  { method: 'POST', path: '/api/timeline-events', body: { executionFileId: 'victim-exec-001', event: { id: '1', title: 't' } } },
  { method: 'POST', path: '/api/upload', body: {} },
  { method: 'POST', path: '/api/upload/remove', body: { paths: [`${VICTIM}/vault/x.pdf`] } },
  { method: 'POST', path: '/api/upload/signed-url', body: { path: `${VICTIM}/vault/x.pdf` } },
  { method: 'GET', path: '/api/forum/status' },
  { method: 'GET', path: '/api/forum/stats' },
  { method: 'GET', path: '/api/forum/posts' },
  { method: 'POST', path: '/api/forum/posts', body: { title: 't', content: 'c' } },
  { method: 'POST', path: '/api/forum/delete', body: { postId: 'p1' } },
  { method: 'POST', path: '/api/forum/pin', body: { postId: 'p1', pinned: true } },
  { method: 'POST', path: '/api/forum/lock', body: { postId: 'p1', locked: true } },
  { method: 'POST', path: '/api/forum/update', body: { postId: 'p1', title: 'hack' } },
  { method: 'GET', path: '/api/forum/ban' },
  { method: 'POST', path: '/api/forum/ban', body: { action: 'ban', userId: VICTIM, userName: 'v', reason: 'x' } },
  { method: 'GET', path: '/api/forum/reports' },
  { method: 'POST', path: '/api/forum/reports', body: { reportId: 'r1', action: 'dismiss' } },
  { method: 'POST', path: '/api/forum/report', body: { postId: 'p1', reason: 'spam' } },
  { method: 'POST', path: '/api/forum/comment', body: { postId: 'p1', content: 'hi' } },
  { method: 'GET', path: '/api/forum/groups' },
  { method: 'POST', path: '/api/forum/groups', body: { name: 'g' } },
  { method: 'POST', path: '/api/forum/groups/join', body: { groupId: 'g1' } },
  { method: 'POST', path: '/api/forum/groups/leave', body: { groupId: 'g1' } },
  { method: 'GET', path: '/api/forum/follow' },
  { method: 'POST', path: '/api/forum/follow', body: { userId: VICTIM } },
  { method: 'GET', path: '/api/forum/mute' },
  { method: 'POST', path: '/api/forum/mute', body: { userId: VICTIM } },
  { method: 'GET', path: '/api/forum/bookmark' },
  { method: 'POST', path: '/api/forum/bookmark', body: { postId: 'p1' } },
  { method: 'GET', path: '/api/forum/notifications' },
  { method: 'POST', path: '/api/forum/notifications', body: { action: 'markRead', ids: ['n1'] } },
  { method: 'GET', path: '/api/auth/lawyer-verification' },
  { method: 'POST', path: '/api/auth/lawyer-verification', body: {} },
  { method: 'PATCH', path: '/api/auth/lawyer-verification', body: {} },
];

async function apiUp(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get('/api/public/healthz');
    const type = res.headers()['content-type'] ?? '';
    if (!type.includes('json')) return false;
    const body = (await res.json()) as { ok?: boolean };
    return res.ok && body.ok === true;
  } catch {
    return false;
  }
}

async function hit(request: APIRequestContext, target: Hit) {
  const options = target.body === undefined ? {} : { data: target.body };
  if (target.method === 'GET') return request.get(target.path);
  if (target.method === 'DELETE') return request.delete(target.path);
  if (target.method === 'PATCH') return request.patch(target.path, options);
  return request.post(target.path, options);
}

function wallOk(status: number): boolean {
  return status >= 401 && status < 500;
}

async function issueLiveCsrf(request: APIRequestContext): Promise<string> {
  const headers = await wifeLiveAuthHeaders({ method: 'GET', url: `${ORIGIN}/api/security/csrf` });
  const res = await request.get('/api/security/csrf', { headers });
  expect(res.status(), 'csrf bootstrap').toBe(200);
  const body = (await res.json()) as { csrfToken?: string };
  return body.csrfToken as string;
}

async function signedPost(request: APIRequestContext, path: string, body: string, csrf: string) {
  const headers = await wifeLiveAuthHeaders({
    method: 'POST',
    url: `${ORIGIN}${path}`,
    body,
    csrf,
  });
  return request.post(path, { headers, data: body });
}

async function signedGet(request: APIRequestContext, path: string) {
  const headers = await wifeLiveAuthHeaders({ method: 'GET', url: `${ORIGIN}${path}` });
  return request.get(path, { headers });
}

test.describe.configure({ timeout: 90_000 });

test.describe('أقصى شدة — كتالوج غير موقّع لكل السطح', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test(`كل المسارات المحمية (${UNSIGNED_PROTECTED.length}) ترفض الطلب غير الموقّع بلا 5xx`, async ({
    request,
  }) => {
    const failures: string[] = [];
    for (const target of UNSIGNED_PROTECTED) {
      const res = await hit(request, target);
      const status = res.status();
      if (status >= 200 && status < 400) {
        failures.push(`${target.method} ${target.path} leaked ${status}`);
      } else if (status >= 500) {
        failures.push(`${target.method} ${target.path} crashed ${status}`);
      } else if (!wallOk(status)) {
        failures.push(`${target.method} ${target.path} unexpected ${status}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

test.describe('أقصى شدة — إقلاع عام بلا تسريب أسرار', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('public/bff لا يسرّب بيئة', async ({ request }) => {
    const res = await request.get('/api/public/bff');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/service_role|SUPABASE_SERVICE|sk_live/i);
  });

  test('refresh بلا كوكي لا يجدّد جلسة', async ({ request }) => {
    const res = await request.post('/api/auth/refresh', { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThan(500);
    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie.toLowerCase()).not.toMatch(/hami_access_token=[^;]+/);
  });

  test('session بتوكن ضيف ليست جلسة محامٍ حقيقية', async ({ request }) => {
    const res = await request.get('/api/auth/session', {
      headers: { cookie: `hami_access_token=${WIFE_LIVE_GUEST_TOKEN}` },
    });
    expect([200, 401]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/access_token|refresh_token/i);
    if (res.status() === 200) {
      expect(text).toMatch(/"user":null/);
    }
  });

  test('forgot-password يتجاهل redirect خبيث ولا يكشف الحساب', async ({ request }) => {
    const res = await request.post('/api/auth/forgot-password', {
      data: {
        email: 'assault-probe-no-account@example.invalid',
        redirectTo: 'https://evil.example/steal',
      },
    });
    expect([200, 400, 429]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toContain('evil.example');
    expect(text).not.toMatch(/user not found|no account|غير موجود/i);
  });

  test('signup فارغ لا يصدر كوكي', async ({ request }) => {
    const res = await request.post('/api/auth/signup', { data: { email: '', password: '' } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie.toLowerCase()).not.toContain('hami_access_token=');
  });
});

test.describe('أقصى شدة — ضيف موقّع يحاول التصعيد', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('ضيف لا يصبح أدمن في /api/admin/verify', async ({ request }) => {
    const res = await signedGet(request, '/api/admin/verify');
    expect([200, 404]).toContain(res.status());
    if (res.status() === 404) return;
    const body = (await res.json()) as { isAdmin?: boolean };
    expect(body.isAdmin).toBe(false);
  });

  test('مسارات تدمير/إدارة تُرفض بعد توقيع الضيف+CSRF', async ({ request }) => {
    const csrf = await issueLiveCsrf(request);
    const shots: Array<{ path: string; body: string; allow: number[] }> = [
      { path: '/api/admin/ban', body: JSON.stringify({ targetUserId: VICTIM, is_banned: true }), allow: [401, 403, 404] },
      { path: '/api/admin/account', body: JSON.stringify({ action: 'set_password', targetUserId: VICTIM, password: 'HamiLaw9x' }), allow: [401, 403, 404] },
      { path: '/api/admin/role', body: JSON.stringify({ targetUserId: VICTIM, role: 'admin' }), allow: [401, 403, 400, 404] },
      { path: '/api/admin/consultations', body: JSON.stringify({ postId: 'p1' }), allow: [401, 403, 404] },
      { path: '/api/admin/devices', body: JSON.stringify({ action: 'revoke', deviceId: VICTIM }), allow: [401, 403, 400, 404] },
      { path: '/api/admin/otp/request', body: JSON.stringify({ deviceFingerprint: '0123456789abcdef0123456789abcdef' }), allow: [401, 403, 404] },
      { path: '/api/forum/ban', body: JSON.stringify({ action: 'ban', userId: VICTIM, userName: 'v', reason: 'x' }), allow: [401, 403, 404] },
      { path: '/api/forum/reports', body: JSON.stringify({ reportId: 'r1', action: 'dismiss' }), allow: [401, 403, 400, 404] },
      { path: '/api/laws/clear', body: JSON.stringify({ law_name: 'قانون التنفيذ', confirm: true }), allow: [401, 403, 404] },
      { path: '/api/laws/add', body: JSON.stringify({ law_name: 'قانون التنفيذ', article_number: '1', content: 'x' }), allow: [401, 403, 404] },
      { path: '/api/laws/import-bundle', body: JSON.stringify({ articles: [] }), allow: [401, 403, 400, 404] },
      { path: '/api/kv-proxy', body: JSON.stringify({ action: 'set', key: `user:${VICTIM}:cases:1`, value: { pwn: true } }), allow: [403] },
      { path: '/api/kv-proxy', body: JSON.stringify({ action: 'del', key: `user:${VICTIM}:cases:1` }), allow: [403] },
      { path: '/api/kv-proxy', body: JSON.stringify({ action: 'delByPrefix', prefix: 'user:' }), allow: [403] },
      { path: '/api/kv-proxy', body: JSON.stringify({ action: 'listKeysByPrefix', prefix: 'user:' }), allow: [403] },
      { path: '/api/kv-proxy', body: JSON.stringify({ action: 'get', key: `notifications_${VICTIM}` }), allow: [403] },
      { path: '/api/upload/remove', body: JSON.stringify({ paths: [`${VICTIM}/vault/secret.pdf`] }), allow: [403] },
      { path: '/api/settings/wipe', body: JSON.stringify({ confirmation: 'WRONG', version: 1 }), allow: [400, 403] },
      { path: '/api/account/delete', body: JSON.stringify({ confirmation: 'WRONG', version: 1 }), allow: [400, 403] },
    ];
    const failures: string[] = [];
    for (const shot of shots) {
      const res = await signedPost(request, shot.path, shot.body, csrf);
      if (res.status() === 200 || res.status() === 201) {
        failures.push(`${shot.path} succeeded ${res.status()}`);
      } else if (!shot.allow.includes(res.status())) {
        failures.push(`${shot.path} got ${res.status()} want ${shot.allow.join('|')}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('خط الزمن لضيف غير UUID لا ينهار ولا يسرّب صفوف الغير', async ({ request }) => {
    const path = `/api/timeline-events?executionFileId=victim-exec-001`;
    const res = await signedGet(request, path);
    const text = await res.text();
    expect(res.status(), text).toBe(200);
    const body = JSON.parse(text) as { rows?: Array<{ user_id?: string }> };
    expect(body.rows ?? []).toEqual([]);
  });

  test('بلاغات المنتدى للضيف ليست قائمة الإدارة', async ({ request }) => {
    const res = await signedGet(request, '/api/forum/reports');
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('OTP أدمن للضيف يُرفض', async ({ request }) => {
    const unsigned = await request.get(
      '/api/admin/otp/status?deviceFingerprint=0123456789abcdef0123456789abcdef',
    );
    expect(unsigned.status()).toBe(200);
    const unsignedBody = (await unsigned.json()) as { trusted?: boolean; sessionRequired?: boolean };
    expect(unsignedBody.trusted).toBe(false);
    expect(unsignedBody.sessionRequired).toBe(true);

    const res = await signedGet(
      request,
      '/api/admin/otp/status?deviceFingerprint=0123456789abcdef0123456789abcdef',
    );
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
    const csrf = await request.get('/api/admin/otp/csrf');
    expect(csrf.status()).toBeGreaterThanOrEqual(401);
    expect(csrf.status()).toBeLessThanOrEqual(403);
  });
});

test.describe('أقصى شدة — بروتوكول وتشفير', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('عبور مسار URL لا يفتح الإدارة', async ({ request }) => {
    const probes = [
      '/api/public/healthz/../admin/ban',
      '/api/kv-proxy/../admin/ban',
      '/api/forum/status/../../admin/ban',
      '/api/admin/ban%00',
    ];
    for (const path of probes) {
      const res = await request.post(path, { data: { targetUserId: VICTIM } });
      expect(res.status(), path).toBeGreaterThanOrEqual(400);
      expect(res.status(), path).toBeLessThan(500);
    }
  });

  test('توقيع csrf ثم إضافة استعلام يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
    });
    const res = await request.get('/api/security/csrf?injected=1', { headers });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('nonce غير قانوني يُرفض', async ({ request }) => {
    const headers = await wifeLiveAuthHeaders({
      method: 'GET',
      url: `${ORIGIN}/api/security/csrf`,
      nonce: 'bad nonce !! spaces',
    });
    const res = await request.get('/api/security/csrf', { headers });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('wife-session DELETE من أصل معادٍ يُرفض', async ({ request }) => {
    const res = await request.delete('/api/security/wife-session', {
      headers: { origin: 'https://evil.test' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    expect(res.status()).toBeLessThanOrEqual(403);
  });

  test('wife-sign لا يوقّع أصلاً خارجياً ولا مساراً عاماً', async ({ request }) => {
    const csrfish = {
      origin: ORIGIN,
      cookie: `hami_access_token=${WIFE_LIVE_GUEST_TOKEN}`,
      'content-type': 'application/json',
    };
    const external = await request.post('/api/security/wife-sign', {
      headers: csrfish,
      data: { method: 'GET', url: 'https://evil.test/api/kv-proxy', body: '' },
    });
    expect(external.status()).toBeGreaterThanOrEqual(400);
    expect(external.status()).toBeLessThan(500);

    const pub = await request.post('/api/security/wife-sign', {
      headers: csrfish,
      data: { method: 'GET', url: '/api/public/healthz', body: '' },
    });
    expect(pub.status()).toBeGreaterThanOrEqual(400);
    expect(pub.status()).toBeLessThan(500);
  });

  test('رفع غير موقّع وSVG يُرفضان', async ({ request }) => {
    const unsigned = await request.post('/api/upload', {
      multipart: {
        file: { name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) },
        category: 'vault',
      },
    });
    expect(unsigned.status()).toBeGreaterThanOrEqual(401);
    expect(unsigned.status()).toBeLessThanOrEqual(403);

    const csrf = await issueLiveCsrf(request);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const headers = await wifeLiveAuthHeaders({
      method: 'POST',
      url: `${ORIGIN}/api/upload`,
      body: 'not-a-real-file-hash',
      csrf,
    });
    const signedWrongType = await request.post('/api/upload', {
      headers: { ...headers, 'content-type': 'application/json' },
      data: { file: svg, category: 'vault' },
    });
    expect(signedWrongType.status()).toBeGreaterThanOrEqual(400);
    expect(signedWrongType.status()).toBeLessThan(500);
  });

  test('رفض 403 يحمل ترويسات أمنية', async ({ request }) => {
    const res = await request.post('/api/admin/ban', { data: { targetUserId: VICTIM } });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    const h = res.headers();
    expect((h['x-content-type-options'] ?? '').toLowerCase()).toContain('nosniff');
    expect((h['x-frame-options'] ?? '').toUpperCase()).toContain('DENY');
  });

  test('أصل معادٍ لا يحصل على CORS مفتوح على kv-proxy', async ({ request }) => {
    const res = await request.post('/api/kv-proxy', {
      headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
      data: { action: 'get', key: `user:${VICTIM}:cases:1` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(401);
    const acao = res.headers()['access-control-allow-origin'] ?? '';
    expect(acao).not.toBe('*');
    expect(acao).not.toContain('evil.test');
  });
});

test.describe('أقصى شدة — عاصفة محدودة ثم صحة', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!(await apiUp(request)), 'Vite /api/* غير متاح');
  });

  test('40 طلباً متوازياً غير موقّع لا تخترق ولا تُسقط الصحة', async ({ request }) => {
    const sample = UNSIGNED_PROTECTED.filter((t) => t.method === 'POST').slice(0, 10);
    const jobs = Array.from({ length: 40 }, (_, i) => hit(request, sample[i % sample.length]));
    const results = await Promise.all(jobs);
    for (const res of results) {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
    expect((await request.get('/api/public/healthz')).status()).toBe(200);
  });
});
