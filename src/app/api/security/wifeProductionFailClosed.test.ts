/**
 * WIFE-006 — production fail-closed when Redis/Supabase stores unavailable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeRedisRest.ts', () => ({
  wifeRedisJson: vi.fn(),
}));

import { wifeRedisJson } from './wifeRedisRest.ts';
import { consumeRateLimitSlot, resetWifeRateLimitStoreForTests } from './wifeRateLimitStore.ts';
import {
  issueCsrfTokenForSubject,
  resetCsrfServerStoreForTests,
} from './csrfServerStore.ts';
import {
  getVerifiedTokenSubject,
  resetWifeTokenSubjectCacheForTests,
} from './wifeTokenSubject.ts';

const originalNodeEnv = process.env.NODE_ENV;

describe('WIFE production fail-closed (WIFE-006)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.WIFE_REDIS_REST_URL = 'https://redis.example';
    process.env.WIFE_REDIS_REST_TOKEN = 'token';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetWifeRateLimitStoreForTests();
    resetCsrfServerStoreForTests();
    vi.mocked(wifeRedisJson).mockRejectedValue(new Error('redis down'));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    resetWifeRateLimitStoreForTests();
    resetCsrfServerStoreForTests();
    vi.clearAllMocks();
  });

  it('blocks rate limit when Redis errors in production (no memory fallback)', async () => {
    expect(await consumeRateLimitSlot('subject-prod', { maxRequests: 100 })).toBe(false);
  });

  it('blocks CSRF issue when Redis errors and Supabase absent in production', async () => {
    expect(await issueCsrfTokenForSubject('11111111-2222-4333-8444-555555555555')).toBeNull();
  });

  it('blocks rate limit without Redis env in production', async () => {
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    expect(await consumeRateLimitSlot('no-redis-subject', { maxRequests: 100 })).toBe(false);
  });

  it('blocks CSRF issue without any durable store in production', async () => {
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    expect(await issueCsrfTokenForSubject('no-redis-subject')).toBeNull();
  });
});

/**
 * الخاصّية التي كشفتها حمرةُ العدّاء ولم يكن يحرسها شيء: مسارُ التحقّق من هوية الرمز
 * يفشل **مُغلَقاً وقبل أيّ نداء شبكة** حين تغيب تهيئةُ مصادقة Supabase. وكان غيابُ
 * الحارس يعني أنّ العطل يُكتشف بسقوط خمسة اختباراتٍ في دريلٍ آخر بسببٍ لا يُسمّيه أحد.
 */
describe('WIFE token identity fail-closed when Supabase auth config is absent', () => {
  const NON_DEV_TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
  const savedUrl = process.env.SUPABASE_URL;
  const savedAnon = process.env.SUPABASE_ANON_KEY;
  const savedPrivileged = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    resetWifeTokenSubjectCacheForTests();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (savedUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = savedUrl;
    if (savedAnon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = savedAnon;
    if (savedPrivileged === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = savedPrivileged;
    resetWifeTokenSubjectCacheForTests();
    vi.unstubAllGlobals();
  });

  it('denies without SUPABASE_ANON_KEY — and emits no network call at all', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await getVerifiedTokenSubject(NON_DEV_TOKEN)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('denies without SUPABASE_URL — the other half of the same condition', async () => {
    delete process.env.SUPABASE_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await getVerifiedTokenSubject(NON_DEV_TOKEN)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  /**
   * عدمُ الرجوع إلى المفتاح المُمتاز **مقصود**: نقطة `/auth/v1/user` تتحقّق من رمز
   * المستخدم نفسه ومفتاحُها `anon`، بينما جارتُها في `wifeNonceStore.ts:63` ترجع إلى
   * المُمتاز لأنّها تكتب في جدول. فالاختلاف تصميمٌ لا سهو — ومَن يُضيف رجوعاً «تسهيلاً»
   * يسقط هنا باسمه بدل أن يوسّع صلاحية مفتاحٍ إداريّ إلى مسار تحقّقٍ من المستخدم.
   */
  it('the privileged key alone does not open the auth path (asymmetry is intentional)', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await getVerifiedTokenSubject(NON_DEV_TOKEN)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
