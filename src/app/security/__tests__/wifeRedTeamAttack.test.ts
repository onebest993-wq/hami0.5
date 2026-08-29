/**
 * WIFE Red Team — محاكاة هجوم منظّم متعدد الموجات.
 * كل موجة = vector حقيقي؛ النتيجة المتوقعة: رفض (false / 4xx).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyWifeSignature, verifyCsrfToken, resetWifeValidatorCachesForTests } from '@/app/api/security/wifeValidator.ts';
import { resetNonceStoreForTests } from '@/app/api/security/wifeNonceStore.ts';
import {
  detectStolenTokenServer,
  registerTokenSessionServer,
  resetStolenTokenServerForTests,
} from '@/app/api/security/stolenTokenServer.ts';
import {
  consumeRateLimitSlot,
  resetWifeRateLimitStoreForTests,
} from '@/app/api/security/wifeRateLimitStore.ts';
import {
  issueCsrfTokenForSubject,
  resetCsrfServerStoreForTests,
  validateCsrfForSubject,
} from '@/app/api/security/csrfServerStore.ts';
import { isKeyOwnedBy, isPrefixOwnedBy } from '@/app/security/kvProxyKeyOwnership';
import { isWifeProtectedApiUrl } from '@/app/security/wifeFetchGuard';
import {
  ATTACKER_ID as USER_A,
  ATTACKER_TOKEN as TOKEN,
  CSRF_ATTACKER as CSRF_A,
  VICTIM_ID as USER_B,
  VICTIM_TOKEN as TOKEN_B,
  buildFakeJwt,
  resetWifeDrillEnv,
  primeDrillCsrf,
  signWifePayload,
  signedPost,
  stubSupabaseAuth,
} from './wifeRedTeamHelpers.ts';

function resetAllWifeTestState(): void {
  resetWifeValidatorCachesForTests();
  resetNonceStoreForTests();
  resetStolenTokenServerForTests();
  resetWifeRateLimitStoreForTests();
  resetCsrfServerStoreForTests();
}

describe('🔴 WAVE 1 — Reconnaissance & unsigned flood', () => {
  beforeEach(async () => {
    resetAllWifeTestState();
    resetWifeDrillEnv();
    stubSupabaseAuth(USER_A);
    await primeDrillCsrf(USER_A);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks completely unsigned POST (no WIFE headers)', async () => {
    const req = new Request('https://app.test/api/forum/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `hami_csrf_token=${CSRF_A}` },
      body: '{"postId":"x"}',
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks request with anon-like empty token', async () => {
    const req = await signedPost({ url: 'https://app.test/api/kv-proxy', body: '{}' });
    expect(await verifyWifeSignature(req, '')).toBe(false);
  });

  it('fetch guard marks cross-origin /api as unprotected (attacker host)', () => {
    Object.defineProperty(window, 'location', { value: { origin: 'https://hami.app' }, configurable: true });
    expect(isWifeProtectedApiUrl('https://evil-phishing.com/api/kv-proxy')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/kv-proxy')).toBe(true);
  });
});

describe('🔴 WAVE 2 — Signature forgery & tampering', () => {
  beforeEach(async () => {
    resetAllWifeTestState();
    resetWifeDrillEnv();
    stubSupabaseAuth(USER_A);
    await primeDrillCsrf(USER_A);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('blocks signature from victim token applied to attacker session token', async () => {
    const body = '{"amount":999999}';
    const url = 'https://app.test/api/forum/posts';
    const ts = String(Date.now());
    const nonce = 'nonce_cross_token_1';
    const sigVictim = await signWifePayload({ method: 'POST', url, timestamp: ts, nonce, body, token: TOKEN_B });
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': sigVictim,
        'x-wife-timestamp': ts,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_A,
        cookie: `hami_csrf_token=${encodeURIComponent(CSRF_A)}`,
      },
      body,
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks path swap: signed /api/a executed against /api/b', async () => {
    const body = '{"x":1}';
    const signedUrl = 'https://app.test/api/forum/posts';
    const attackUrl = 'https://app.test/api/forum/delete';
    const ts = String(Date.now());
    const nonce = 'nonce_path_swap_1';
    const sig = await signWifePayload({ method: 'POST', url: signedUrl, timestamp: ts, nonce, body, token: TOKEN });
    const req = new Request(attackUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': sig,
        'x-wife-timestamp': ts,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_A,
        cookie: `hami_csrf_token=${encodeURIComponent(CSRF_A)}`,
      },
      body,
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks method swap: signed GET body used for POST', async () => {
    const body = '';
    const url = 'https://app.test/api/security/csrf';
    const ts = String(Date.now());
    const nonce = 'nonce_method_swap_1';
    const sig = await signWifePayload({ method: 'GET', url, timestamp: ts, nonce, body, token: TOKEN });
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wife-signature': sig,
        'x-wife-timestamp': ts,
        'x-wife-nonce': nonce,
        'x-csrf-token': CSRF_A,
        cookie: `hami_csrf_token=${encodeURIComponent(CSRF_A)}`,
      },
      body: '{"injected":true}',
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks SQL/XSS injection in JSON body after signing different body', async () => {
    const safe = '{"title":"case"}';
    const malicious = '{"title":"<script>alert(1)</script>","drop":"; DELETE FROM users;--"}';
    const req = await signedPost({ url: 'https://app.test/api/forum/update', body: safe });
    const attackReq = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: malicious,
    });
    expect(await verifyWifeSignature(attackReq, TOKEN)).toBe(false);
  });
});

describe('🔴 WAVE 3 — Replay & time manipulation', () => {
  beforeEach(async () => {
    resetAllWifeTestState();
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    stubSupabaseAuth(USER_A);
    await primeDrillCsrf(USER_A);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('blocks stale timestamp beyond 120s window', async () => {
    const stale = String(Date.now() - 121_000);
    const req = await signedPost({
      url: 'https://app.test/api/kv-proxy',
      body: '{}',
      timestamp: stale,
      nonce: 'nonce_stale_ts_123456',
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks far-future timestamp (clock skew attack)', async () => {
    const future = String(Date.now() + 121_000);
    const req = await signedPost({
      url: 'https://app.test/api/kv-proxy',
      body: '{}',
      timestamp: future,
      nonce: 'nonce_future_ts_123456',
    });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(false);
  });

  it('blocks real nonce replay (second identical nonce rejected)', async () => {
    const nonce = 'nonce_replay_live_abcdef12';
    const url = 'https://app.test/api/forum/posts';
    const body = '{"a":1}';
    const req1 = await signedPost({ url, body, nonce });
    expect(await verifyWifeSignature(req1, TOKEN)).toBe(true);
    const req2 = await signedPost({ url, body: '{"a":2}', nonce });
    expect(await verifyWifeSignature(req2, TOKEN)).toBe(false);
  });
});

describe('🔴 WAVE 4 — CSRF & session hijack attempts', () => {
  beforeEach(async () => {
    resetAllWifeTestState();
    process.env.NODE_ENV = 'test';
    stubSupabaseAuth(USER_A);
    await primeDrillCsrf(USER_A);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('blocks CSRF token belonging to another user (server registry)', async () => {
    await issueCsrfTokenForSubject(USER_A);
    const tokenB = await issueCsrfTokenForSubject(USER_B);
    expect(tokenB).toBeTruthy();
    expect(await validateCsrfForSubject(USER_A, tokenB!)).toBe(false);
  });

  it('production بدون Redis: لا يُصدَر CSRF (fail-closed)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    expect(await issueCsrfTokenForSubject(USER_A)).toBeNull();
  });

  it('production: CSRF غير مسجّل يُرفض', async () => {
    process.env.NODE_ENV = 'production';
    const rogue = 'RogueCsrfToken1234567890AbCd';
    const req = new Request('https://app.test/api/forum/report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': rogue,
        cookie: `hami_csrf_token=${encodeURIComponent(rogue)}`,
      },
      body: '{"reason":"spam"}',
    });
    expect(await verifyCsrfToken(req, TOKEN)).toBe(false);
  });

  it('blocks malformed CSRF tokens (script injection shapes)', async () => {
    const jwt = buildFakeJwt({ sub: USER_A, jti: 'j1', iat: 1, exp: 9999999999 });
    const req = new Request('https://app.test/api/x', {
      method: 'POST',
      headers: { 'x-csrf-token': '<script>alert(1)</script>' },
    });
    expect(await verifyCsrfToken(req, jwt)).toBe(false);
  });
});

describe('🔴 WAVE 5 — KV lateral movement & data exfiltration', () => {
  const ME = USER_A;
  const VICTIM = USER_B;

  it('blocks read of victim notifications key', () => {
    expect(isKeyOwnedBy(`notifications_${VICTIM}`, ME, 'read')).toBe(false);
  });

  it('blocks write via userId embedded in wrong segment', () => {
    expect(isKeyOwnedBy(`user:${VICTIM}:cases:${ME}-inject`, ME, 'write')).toBe(false);
    expect(isKeyOwnedBy(`calendar:${VICTIM}:events:1`, ME, 'write')).toBe(false);
  });

  it('blocks prefix enumeration of all users (catastrophic prefix)', () => {
    expect(isPrefixOwnedBy('user:', ME, 'read')).toBe(false);
    expect(isPrefixOwnedBy('calendar:', ME, 'write')).toBe(false);
    expect(isPrefixOwnedBy(`user:${VICTIM}:`, ME, 'read')).toBe(false);
  });

    it('blocks writing community global keys through kv-proxy', () => {
        expect(isKeyOwnedBy('community:posts:inject', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:secret', ME, 'write')).toBe(false);
        expect(isKeyOwnedBy('repository:docs:secret', ME, 'read')).toBe(false);
        expect(isKeyOwnedBy('banned:users:admin', ME, 'write')).toBe(false);
    });

  it('blocks follow impersonation (attacker follows as victim)', () => {
    expect(isKeyOwnedBy(`follow:${VICTIM}:${ME}`, ME, 'write')).toBe(false);
    expect(isKeyOwnedBy(`follow:${VICTIM}:stranger-id`, ME, 'read')).toBe(false);
  });
});

describe('🔴 WAVE 6 — Token cloning & stolen JWT radar', () => {
  beforeEach(() => {
    resetAllWifeTestState();
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('detects cloned JWT (same jti, different device)', async () => {
    const token = buildFakeJwt({
      sub: USER_A,
      jti: 'jti-clone-wave6',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await registerTokenSessionServer(token, 'device-legitimate-aa');
    const verdict = await detectStolenTokenServer(token, 'device-attacker-bb');
    expect(verdict.status).toBe('cloned');
  });

  it('detects resurrected old jti after refresh', async () => {
    const now = Math.floor(Date.now() / 1000);
    const newer = buildFakeJwt({ sub: USER_A, jti: 'jti-new', iat: now, exp: now + 3600 });
    const older = buildFakeJwt({ sub: USER_A, jti: 'jti-old', iat: now - 120, exp: now + 3600 });
    await registerTokenSessionServer(newer, 'device-same-cccccccc');
    const verdict = await detectStolenTokenServer(older, 'device-same-cccccccc');
    expect(verdict.status).toBe('stolen');
  });
});

describe('🔴 WAVE 7 — Rate limit', () => {
  beforeEach(() => {
    resetAllWifeTestState();
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
  });

  it('blocks burst beyond rate budget (100/min simulated attacker)', async () => {
    const attackerKey = 'red-team-bot-001';
    let allowed = 0;
    let blocked = 0;
    for (let i = 0; i < 110; i++) {
      const ok = await consumeRateLimitSlot(attackerKey, { scope: 'wife', maxRequests: 100, windowMs: 60_000 });
      if (ok) allowed++;
      else blocked++;
    }
    expect(allowed).toBeLessThanOrEqual(100);
    expect(blocked).toBeGreaterThanOrEqual(10);
  });
});

describe('🔴 WAVE 8 — Banned / deactivated account', () => {
  beforeEach(async () => {
    resetAllWifeTestState();
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    stubSupabaseAuth(USER_A, { id: USER_A, status: 'banned', is_banned: true, deleted_at: null });
    await primeDrillCsrf(USER_A);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('توقيع HMAC يبقى صالحاً للحساب المحظور — الحظر طبقة الجلسة/الكتابة لا التوقيع', async () => {
    const req = await signedPost({ url: 'https://app.test/api/forum/posts', body: '{}' });
    expect(await verifyWifeSignature(req, TOKEN)).toBe(true);
  });
});
