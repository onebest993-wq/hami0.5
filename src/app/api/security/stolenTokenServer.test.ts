import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectStolenTokenServer,
  isValidWifeDeviceId,
  registerTokenSessionServer,
  resetStolenTokenServerForTests,
} from './stolenTokenServer.ts';
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';

/*
 * التوكنات هنا بشكل توكن Supabase الحقيقي: `session_id` بلا `jti`.
 * الحالات السابقة كانت تبني توكنات تحمل `jti`، وهو حقل اختياري لا تُصدره
 * Supabase، فكانت تمرّ خضراء بينما الكشف كلّه معطّل في الإنتاج: كل توكن حقيقي
 * يفشل تحليله فيُعاد `valid` بحجّة `cannot-decode`.
 */

const nowSec = () => Math.floor(Date.now() / 1000);

describe('stolenTokenServer', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetStolenTokenServerForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يقرأ توكن Supabase الحقيقي — لا jti بل session_id', () => {
    const fields = extractJwtSessionFields(supabaseToken({ sub: 'user-shape' }));
    expect(fields).not.toBeNull();
    expect(fields?.sessionId).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('registers first seen token in memory store (non-production)', async () => {
    const token = supabaseToken({ sub: 'user-a' });

    const first = await detectStolenTokenServer(token, 'device-aaaaaaaa');
    expect(first.status).toBe('valid');

    const registered = await registerTokenSessionServer(token, 'device-aaaaaaaa');
    expect(registered).toBe(true);
  });

  it('flags cloned token when the same session arrives without a device id', async () => {
    const token = supabaseToken({ sub: 'user-empty-device', sessionId: 'session-empty-dev' });

    await registerTokenSessionServer(token, 'device-bound0001');
    const verdict = await detectStolenTokenServer(token, '');
    expect(verdict.status).toBe('cloned');
  });

  it('flags stolen token when an unregistered older session is replayed', async () => {
    const older = supabaseToken({
      sub: 'user-c',
      sessionId: 'session-old',
      iat: nowSec() - 600,
    });
    const newer = supabaseToken({ sub: 'user-c', sessionId: 'session-new' });

    await registerTokenSessionServer(newer, 'device-dddddddd');
    const verdict = await detectStolenTokenServer(older, 'device-dddddddd');
    expect(verdict.status).toBe('stolen');
  });

  /*
   * الحالتان التاليتان تحرسان ضدّ الحبس الكاذب: تجديد التوكن كل ساعة، ومحامٍ
   * يعمل على هاتف ولوح في آن. كلاهما سلوك يومي، وإطلاق حكم «مسروق» عليه يقفل
   * الإضبارة في وجه صاحبها.
   */
  it('لا يحبس تجديد التوكن — الجلسة نفسها بطابع زمني أحدث', async () => {
    const sub = 'user-refresh';
    const sessionId = 'session-kept-across-refresh';
    const initial = supabaseToken({ sub, sessionId, iat: nowSec() - 3600 });
    await detectStolenTokenServer(initial, 'device-eeeeeeee');

    const refreshed = supabaseToken({ sub, sessionId, iat: nowSec() });
    const verdict = await detectStolenTokenServer(refreshed, 'device-eeeeeeee');

    expect(verdict.status).toBe('valid');
  });

  it('لا يحبس جهازين لنفس المحامي — جلستان مسجّلتان', async () => {
    const sub = 'user-two-devices';
    const phone = supabaseToken({ sub, sessionId: 'session-phone', iat: nowSec() - 1800 });
    const tablet = supabaseToken({ sub, sessionId: 'session-tablet', iat: nowSec() });

    expect((await detectStolenTokenServer(phone, 'device-phone0001')).status).toBe('valid');
    expect((await detectStolenTokenServer(tablet, 'device-tablet01')).status).toBe('valid');
    // الهاتف يعود بعد دخول اللوح: جلسته مسجّلة فلا يُقرأ كتوكن قديم مُعاد
    expect((await detectStolenTokenServer(phone, 'device-phone0001')).status).toBe('valid');
  });

  it('validates device id format for production binding', () => {
    expect(isValidWifeDeviceId('device-aaaaaaaa')).toBe(true);
    expect(isValidWifeDeviceId('short')).toBe(false);
    expect(isValidWifeDeviceId('')).toBe(false);
    expect(isValidWifeDeviceId('<script>')).toBe(false);
  });
});

/** حمولة على شكل توكن Supabase: session_id مطلوب، jti غائب */
function supabaseToken(options: { sub: string; sessionId?: string; iat?: number }): string {
  const iat = options.iat ?? nowSec();
  return buildFakeJwt({
    iss: 'https://project.supabase.co/auth/v1',
    aud: 'authenticated',
    role: 'authenticated',
    aal: 'aal1',
    email: 'lawyer@example.iq',
    phone: '',
    is_anonymous: false,
    session_id: options.sessionId ?? '11111111-2222-3333-4444-555555555555',
    sub: options.sub,
    iat,
    exp: iat + 3600,
  });
}

function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = b64Json({ alg: 'HS256', typ: 'JWT' });
  const body = b64Json(payload);
  return `${header}.${body}.signature`;
}

function b64Json(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
