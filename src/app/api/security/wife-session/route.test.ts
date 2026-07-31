import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUBJECT = 'user-wife-session-route';
const DEVICE_ID = 'routewife000000001';

vi.mock('../../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(() => 'test-user-token-abcdefghijklmnopqrstuvwxyz'),
  getVerifiedTokenSubject: vi.fn().mockResolvedValue('user-wife-session-route'),
  isTokenAuthorized: vi.fn().mockResolvedValue(true),
  wifeUnauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  ),
}));

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
  return {
    ...actual,
    requireWifeUser: vi.fn(async () => ({ ok: true as const, userId: 'user-wife-session-route' })),
  };
});

vi.mock('../../security/stolenTokenServer.ts', () => ({
  extractDeviceIdFromRequest: vi.fn(() => DEVICE_ID),
  isValidWifeDeviceId: vi.fn(() => true),
}));

import { resetCsrfServerStoreForTests } from '../../security/csrfServerStore.ts';
import { resolveWifeSessionSecretForSubject, resetWifeSessionStoreForTests } from '../../security/wifeSessionServerStore.ts';
import { DELETE, GET } from './route.ts';

describe('wife-session route lifecycle', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetCsrfServerStoreForTests();
    resetWifeSessionStoreForTests();
  });

  it('reuses the active session for the same subject and device', async () => {
    const req = new Request('https://app.test/api/security/wife-session', {
      method: 'GET',
      headers: {
        origin: 'https://app.test',
        referer: 'https://app.test/dashboard',
        'x-wife-device-id': DEVICE_ID,
      },
    });

    const first = await GET(req);
    const firstPayload = (await first.json()) as { sessionId?: string; sessionSecret?: string };
    const second = await GET(req);
    const secondPayload = (await second.json()) as { sessionId?: string; sessionSecret?: string };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstPayload.sessionId).toBeTruthy();
    expect(firstPayload.sessionId).toBe(secondPayload.sessionId);
    expect(firstPayload.sessionSecret).toBe(secondPayload.sessionSecret);
  });

  it('deletes the current WIFE session and clears the CSRF cookie', async () => {
    const bootstrapReq = new Request('https://app.test/api/security/wife-session', {
      method: 'GET',
      headers: {
        origin: 'https://app.test',
        referer: 'https://app.test/dashboard',
        'x-wife-device-id': DEVICE_ID,
      },
    });
    const bootstrapRes = await GET(bootstrapReq);
    const bootstrapPayload = (await bootstrapRes.json()) as { sessionId: string };

    const revokeReq = new Request('https://app.test/api/security/wife-session', {
      method: 'DELETE',
      headers: {
        origin: 'https://app.test',
        referer: 'https://app.test/dashboard',
        'x-wife-device-id': DEVICE_ID,
        'x-wife-session': bootstrapPayload.sessionId,
        'x-csrf-token': 'csrf-token-value-1234567890',
        cookie: 'hami_csrf_token=csrf-token-value-1234567890',
      },
    });
    const revokeRes = await DELETE(revokeReq);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(
      resolveWifeSessionSecretForSubject(bootstrapPayload.sessionId, SUBJECT, DEVICE_ID),
    ).resolves.toBeNull();
  });
});
