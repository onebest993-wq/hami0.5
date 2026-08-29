import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  resetWifeValidatorCachesForTests,
} from './wifeValidator.ts';

const VICTIM_ID = 'victim-lawyer-sub-001';
const VICTIM_TOKEN = 'victim-access-token-abcdefghijklmnopqrstuvwxyz';

const originalNodeEnv = process.env.NODE_ENV;

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.not-a-real-signature-paddingxx`;
}

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('WIFE token subject cache & extraction', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.WIFE_ALLOW_DEV_ACCESS_TOKEN;
    delete process.env.FORUM_ALLOW_DEMO_GUEST_READ;
    delete process.env.EXECUTION_ALLOW_DEMO_GUEST;
    resetWifeValidatorCachesForTests();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.unstubAllGlobals();
  });

  it('لا يحوّل JWT مزوّر بنفس sub إلى هوية ضحية بعد كاش توكن حقيقي', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) {
          const auth = new Headers(init?.headers);
          if ((auth.get('Authorization') ?? '').includes(VICTIM_TOKEN)) {
            return okJson({ id: VICTIM_ID });
          }
          return new Response('unauthorized', { status: 401 });
        }
        return new Response('not found', { status: 404 });
      }),
    );

    await expect(getVerifiedTokenSubject(VICTIM_TOKEN)).resolves.toBe(VICTIM_ID);

    const forged = fakeJwt({
      sub: VICTIM_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await expect(getVerifiedTokenSubject(forged)).resolves.toBeNull();
  });

  it('يرفض dev-access-token في الإنتاج بلا راية عرض', async () => {
    process.env.NODE_ENV = 'production';
    await expect(getVerifiedTokenSubject('dev-access-token-guest-lawyer-1')).resolves.toBeNull();
    await expect(getVerifiedTokenSubject('dev-access-token-admin-uuid-1')).resolves.toBeNull();
  });

  it('يقبل ضيف العرض في الإنتاج فقط عند راية صريحة', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FORUM_ALLOW_DEMO_GUEST_READ = '1';
    await expect(getVerifiedTokenSubject('dev-access-token-guest-lawyer-1')).resolves.toBe(
      'guest-lawyer-1',
    );
    await expect(getVerifiedTokenSubject('dev-access-token-admin-uuid-1')).resolves.toBeNull();
  });

  it('يقبل dev-access-token بموضوع UUID في التطوير (WIFE-007 surrogate)', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    await expect(getVerifiedTokenSubject(`dev-access-token-${uuid}`)).resolves.toBe(uuid);
  });

  it('يرفض dev-access-token بموضوع UUID في الإنتاج بلا راية', async () => {
    process.env.NODE_ENV = 'production';
    const uuid = '11111111-2222-4333-8444-555555555555';
    await expect(getVerifiedTokenSubject(`dev-access-token-${uuid}`)).resolves.toBeNull();
  });

  it('يرفض Bearer وكوكي مختلفين بدل انتحال صامت', () => {
    const req = new Request('https://app.test/api/forum/posts', {
      headers: {
        authorization: 'Bearer stolen-victim-token-aaaaaaaa',
        cookie: 'hami_access_token=real-http-only-token-bbbbbbbb',
      },
    });
    expect(extractUserTokenFromRequest(req)).toBeNull();
  });

  it('يقبل Bearer وكوكي متطابقين', () => {
    const token = 'same-session-token-aaaaaaaaaaaa';
    const req = new Request('https://app.test/api/forum/posts', {
      headers: {
        authorization: `Bearer ${token}`,
        cookie: `hami_access_token=${token}`,
      },
    });
    expect(extractUserTokenFromRequest(req)).toBe(token);
  });

  it('reads the adapter cookie fallback when Cookie is absent', () => {
    const token = 'fallback-session-token-aaaaaaaa';
    const req = new Request('https://app.test/api/forum/posts', {
      headers: {
        'x-hami-incoming-cookie': `hami_access_token=${token}`,
      },
    });
    expect(extractUserTokenFromRequest(req)).toBe(token);
  });
});
