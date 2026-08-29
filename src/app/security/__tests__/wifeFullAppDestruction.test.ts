/**
 * WIFE Full-Application Destruction Drill — طبقة التشفير والجلسة.
 * محاكاة هجمات عنيفة على كل مسار BFF: بحث قانوني، تنفيذ، منتدى، رفع، إدارة.
 * النتيجة المتوقعة: verifyWifeSignature / verifyCsrfToken = false أو رفض ملكية KV.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyWifeSignature, verifyCsrfToken, enforceTokenActorBinding, resetWifeValidatorCachesForTests } from '@/app/api/security/wifeValidator.ts';
import { resetNonceStoreForTests } from '@/app/api/security/wifeNonceStore.ts';
import { resetStolenTokenServerForTests } from '@/app/api/security/stolenTokenServer.ts';
import { resetWifeRateLimitStoreForTests } from '@/app/api/security/wifeRateLimitStore.ts';
import { resetCsrfServerStoreForTests } from '@/app/api/security/csrfServerStore.ts';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership';
import { sanitizePayload } from '@/app/api/security/sanitizer.ts';
import {
  ALL_BFF_ENDPOINTS,
  ATTACKER_ID,
  ATTACKER_TOKEN,
  BffEndpoint,
  buildEndpointUrl,
  CSRF_ATTACKER,
  signedRequest,
  stubSupabaseAuth,
  VICTIM_ID,
  VICTIM_TOKEN,
  resetWifeDrillEnv,
  primeDrillCsrf,
  unsignedRequest,
} from './wifeRedTeamHelpers.ts';

const BASE = 'https://app.test';

function resetAll(): void {
  resetWifeValidatorCachesForTests();
  resetNonceStoreForTests();
  resetStolenTokenServerForTests();
  resetWifeRateLimitStoreForTests();
  resetCsrfServerStoreForTests();
}

describe('💥 DESTRUCTION WAVE A — Unsigned flood on every BFF route', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(ALL_BFF_ENDPOINTS.map((ep) => [ep.method, ep.path, ep] as const))(
    'blocks unsigned %s %s',
    async (_method, path:_path, ep) => {
      const url = buildEndpointUrl(BASE, ep);
      const req = unsignedRequest(url, ep.method, ep.body ?? '');
      expect(await verifyWifeSignature(req, ATTACKER_TOKEN)).toBe(false);
    },
  );
});

describe('💥 DESTRUCTION WAVE B — Cross-route signature transplant (path swap)', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const HIGH_VALUE_TARGETS: BffEndpoint[] = [
    { path: '/api/admin/ban', method: 'POST', body: '{"requesterId":"a","targetUserId":"victim","updates":{"is_banned":true}}' },
    { path: '/api/admin/role', method: 'POST', body: '{"targetUserId":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee","role":"admin"}' },
    { path: '/api/admin/users', method: 'GET' },
    { path: '/api/admin/stats', method: 'GET' },
    { path: '/api/admin/status', method: 'GET' },
    { path: '/api/admin/audit', method: 'GET' },
    { path: '/api/admin/devices', method: 'GET' },
    { path: '/api/admin/devices', method: 'POST', body: '{"action":"revoke","deviceId":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"}' },
    { path: '/api/admin/consultations', method: 'POST', body: '{"postId":"p1"}' },
    { path: '/api/laws/clear', method: 'POST', body: '{"law_name":"قانون التنفيذ","confirm":true}' },
    { path: '/api/kv-proxy', method: 'POST', body: '{"action":"del","key":"lawyer_files:victim:exec-1"}' },
    { path: '/api/settings/wipe', method: 'POST', body: '{"confirmation":"WIPE_ALL_APPLICATION_DATA_V1","version":1}' },
    { path: '/api/forum/ban', method: 'POST', body: '{"action":"ban","userId":"victim","userName":"V","reason":"hack"}' },
    { path: '/api/upload/remove', method: 'POST', body: '{"paths":["victim/vault/secret.pdf"]}' },
    { path: '/api/timeline-events', method: 'POST', body: '{"executionFileId":"victim-exec","event":{"id":"inj","title":"poison"}}' },
  ];

  it.each(HIGH_VALUE_TARGETS.map((t) => [t.path, t] as const))(
    'blocks signature signed for /api/forum/posts but sent to %s',
    async (_path, target) => {
      const decoyUrl = buildEndpointUrl(BASE, { path: '/api/forum/posts', method: 'POST', body: '{"title":"decoy"}' });
      const attackUrl = buildEndpointUrl(BASE, target);
      const body = target.body ?? '{}';
      const req = await signedRequest({ url: decoyUrl, method: 'POST', body: '{"title":"decoy"}' });
      const transplanted = new Request(attackUrl, {
        method: target.method,
        headers: req.headers,
        body: target.method === 'GET' ? undefined : body,
      });
      expect(await verifyWifeSignature(transplanted, ATTACKER_TOKEN)).toBe(false);
    },
  );
});

describe('💥 DESTRUCTION WAVE C — Legal search & laws catalog abuse', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks body swap after signing laws/list (SQL injection payload)', async () => {
    const safe = '{"law_name":"قانون التنفيذ"}';
    const malicious = '{"law_name":"\'; DROP TABLE laws;--"}';
    const url = buildEndpointUrl(BASE, { path: '/api/laws/list', method: 'POST', body: safe });
    const req = await signedRequest({ url, body: safe });
    const swapped = new Request(url, { method: 'POST', headers: req.headers, body: malicious });
    expect(await verifyWifeSignature(swapped, ATTACKER_TOKEN)).toBe(false);
  });

  it('sanitizer strips XSS from forum comment payload (stored XSS mitigation at BFF)', () => {
    const raw = { content: '<img src=x onerror=alert(1)><script>document.cookie</script>' };
    const clean = sanitizePayload(raw) as { content: string };
    expect(clean.content).not.toMatch(/<script/i);
    expect(clean.content).not.toMatch(/onerror/i);
  });

  it('blocks replay of laws/list nonce on laws/add (cross-endpoint replay)', async () => {
    const nonce = 'nonce_laws_replay_cross_ep';
    const listUrl = buildEndpointUrl(BASE, { path: '/api/laws/list', method: 'POST', body: '{}' });
    const addUrl = buildEndpointUrl(BASE, { path: '/api/laws/add', method: 'POST', body: '{"law_name":"x"}' });
    const req1 = await signedRequest({ url: listUrl, body: '{}', nonce });
    expect(await verifyWifeSignature(req1, ATTACKER_TOKEN)).toBe(true);
    const req2 = await signedRequest({ url: addUrl, body: '{"law_name":"x"}', nonce });
    expect(await verifyWifeSignature(req2, ATTACKER_TOKEN)).toBe(false);
  });
});

describe('💥 DESTRUCTION WAVE D — Execution & timeline lateral movement', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks KV read of victim execution snapshot via lawyer_files prefix', () => {
    expect(isKeyOwnedBy(`lawyer_files:${VICTIM_ID}:exec-999`, ATTACKER_ID, 'read')).toBe(false);
    expect(isPrefixOwnedBy(`lawyer_files:${VICTIM_ID}:`, ATTACKER_ID, 'write')).toBe(false);
  });

  it('blocks KV delete of victim calendar events', () => {
    expect(isKeyOwnedBy(`calendar:${VICTIM_ID}:events:deadline-1`, ATTACKER_ID, 'write')).toBe(false);
  });

  it('blocks timeline-events GET signed with victim token on attacker session', async () => {
    const url = buildEndpointUrl(BASE, {
      path: '/api/timeline-events',
      method: 'GET',
      query: 'executionFileId=victim-exec-file',
    });
    const ts = String(Date.now());
    const nonce = 'nonce_timeline_cross_token';
    const body = '';
    const sigVictim = await import('./wifeRedTeamHelpers.ts').then((m) =>
      m.signWifePayload({ method: 'GET', url, timestamp: ts, nonce, body, token: VICTIM_TOKEN }),
    );
    const req = new Request(url, {
      method: 'GET',
      headers: {
        'x-wife-signature': sigVictim,
        'x-wife-timestamp': ts,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_ATTACKER,
        cookie: `hami_csrf_token=${encodeURIComponent(CSRF_ATTACKER)}`,
      },
    });
    expect(await verifyWifeSignature(req, ATTACKER_TOKEN)).toBe(false);
  });
});

describe('💥 DESTRUCTION WAVE E — Forum destruction & moderation bypass attempts', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const FORUM_STRIKES: BffEndpoint[] = ALL_BFF_ENDPOINTS.filter((e) => e.path.startsWith('/api/forum/'));

  it('blocks tampered body on forum/delete (postId swap after sign)', async () => {
    const safe = '{"postId":"own-post"}';
    const hijack = '{"postId":"admin-pinned-post"}';
    const url = buildEndpointUrl(BASE, { path: '/api/forum/delete', method: 'POST', body: safe });
    const req = await signedRequest({ url, body: safe });
    const attack = new Request(url, { method: 'POST', headers: req.headers, body: hijack });
    expect(await verifyWifeSignature(attack, ATTACKER_TOKEN)).toBe(false);
  });

  it.each(FORUM_STRIKES.filter((e) => e.method === 'POST').slice(0, 8).map((e) => [e.path, e] as const))(
    'blocks stale timestamp on forum POST %s',
    async (_path, ep) => {
      const url = buildEndpointUrl(BASE, ep);
      const stale = String(Date.now() - 130_000);
      const req = await signedRequest({
        url,
        method: 'POST',
        body: ep.body ?? '{}',
        timestamp: stale,
        nonce: `nonce_stale_forum_${ep.path.replace(/\//g, '_')}`,
      });
      expect(await verifyWifeSignature(req, ATTACKER_TOKEN)).toBe(false);
    },
  );
});

describe('💥 DESTRUCTION WAVE F — Upload & storage exfiltration', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks path-traversal body swap on upload/remove after signing safe path', async () => {
    const safe = '{"paths":["attacker/vault/ok.pdf"]}';
    const traversal = '{"paths":["../../victim/vault/secret.pdf","attacker/vault/ok.pdf"]}';
    const url = buildEndpointUrl(BASE, { path: '/api/upload/remove', method: 'POST', body: safe });
    const req = await signedRequest({ url, body: safe });
    const attack = new Request(url, { method: 'POST', headers: req.headers, body: traversal });
    expect(await verifyWifeSignature(attack, ATTACKER_TOKEN)).toBe(false);
  });

  it('blocks signed-url request with swapped victim path', async () => {
    const safe = '{"path":"attacker/vault/a.pdf","expiresIn":3600}';
    const victim = '{"path":"victim/vault/private.pdf","expiresIn":3600}';
    const url = buildEndpointUrl(BASE, { path: '/api/upload/signed-url', method: 'POST', body: safe });
    const req = await signedRequest({ url, body: safe });
    const attack = new Request(url, { method: 'POST', headers: req.headers, body: victim });
    expect(await verifyWifeSignature(attack, ATTACKER_TOKEN)).toBe(false);
  });

  it('blocks multipart upload when x-wife-content-hash header swapped after signing', async () => {
    const hashSigned = 'a'.repeat(64);
    const hashAttack = 'b'.repeat(64);
    const url = buildEndpointUrl(BASE, { path: '/api/upload', method: 'POST', body: '{}' });
    const timestamp = String(Date.now());
    const nonce = 'nonce_upload_hash_swap_1';
    const signed = await import('./wifeRedTeamHelpers.ts').then((m) =>
      m.signWifePayload({
        method: 'POST',
        url,
        timestamp,
        nonce,
        body: hashSigned,
        token: ATTACKER_TOKEN,
      }),
    );
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=attack',
        'x-wife-signature': signed,
        'x-wife-timestamp': timestamp,
        'x-wife-nonce': nonce,
        'x-wife-content-hash': hashAttack,
        'x-csrf-token': CSRF_ATTACKER,
        cookie: `hami_csrf_token=${encodeURIComponent(CSRF_ATTACKER)}`,
      },
      body: '--attack--',
    });
    expect(await verifyWifeSignature(req, ATTACKER_TOKEN)).toBe(false);
  });
});

describe('💥 DESTRUCTION WAVE G — Admin & privilege escalation (crypto layer)', () => {
  beforeEach(() => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID, {
      id: ATTACKER_ID,
      role: 'lawyer',
      user_metadata: { role: 'SUPER_ADMIN', systemRole: 'admin' },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('توقيع HMAC للمحامي المحظور لا يمنح مقر القيادة — البوابة التالية ترفض', async () => {
    vi.unstubAllGlobals();
    stubSupabaseAuth(ATTACKER_ID, { id: ATTACKER_ID, status: 'banned', is_banned: true });
    const url = buildEndpointUrl(BASE, {
      path: '/api/admin/ban',
      method: 'POST',
      body: '{"requesterId":"x","targetUserId":"y"}',
    });
    const req = await signedRequest({ url, body: '{"requesterId":"x","targetUserId":"y"}' });
    expect(await verifyWifeSignature(req, ATTACKER_TOKEN)).toBe(true);
  });

  it('blocks CSRF-only header without cookie on POST admin/ban (production XSS shape)', async () => {
    process.env.NODE_ENV = 'production';
    const url = buildEndpointUrl(BASE, {
      path: '/api/admin/ban',
      method: 'POST',
      body: '{"requesterId":"x","targetUserId":"y"}',
    });
    const req = await signedRequest({ url, body: '{"requesterId":"x","targetUserId":"y"}' });
    const stripped = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': req.headers.get('x-wife-signature')!,
        'x-wife-timestamp': req.headers.get('x-wife-timestamp')!,
        'x-wife-nonce': req.headers.get('x-wife-nonce')!,
        'x-csrf-token': CSRF_ATTACKER,
      },
      body: '{"requesterId":"x","targetUserId":"y"}',
    });
    expect(await verifyCsrfToken(stripped, ATTACKER_TOKEN)).toBe(false);
  });
});

describe('💥 DESTRUCTION WAVE H — Client requests actor binding', () => {
  beforeEach(async () => {
    resetAll();
    resetWifeDrillEnv();
    stubSupabaseAuth(ATTACKER_ID);
    await primeDrillCsrf(ATTACKER_ID);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks create request where lawyer_id is victim (impersonation)', async () => {
    const payload = {
      id: 'req-inject-1',
      client_id: ATTACKER_ID,
      lawyer_id: VICTIM_ID,
      title: 'hijack',
      encrypted_details: '',
      data_signature: '',
      status: 'open',
      created_at: new Date().toISOString(),
    };
    expect(await enforceTokenActorBinding(ATTACKER_TOKEN, payload)).toBe(false);
  });

  it('blocks create request where client_id is victim', async () => {
    const payload = {
      id: 'req-inject-2',
      client_id: VICTIM_ID,
      lawyer_id: ATTACKER_ID,
      title: 'hijack',
      encrypted_details: '',
      data_signature: '',
      status: 'open',
      created_at: new Date().toISOString(),
    };
    expect(await enforceTokenActorBinding(ATTACKER_TOKEN, payload)).toBe(false);
  });
});
