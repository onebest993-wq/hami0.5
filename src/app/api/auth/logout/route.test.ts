import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../security/wifeValidator.ts', () => ({
  getVerifiedTokenSubject: vi.fn().mockResolvedValue('logout-user'),
}));

import { POST } from './route.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';
import { registerTokenSessionServer, resetStolenTokenServerForTests, detectStolenTokenServer } from '../../security/stolenTokenServer.ts';
import {
  issueWifeSessionForSubject,
  resetWifeSessionStoreForTests,
  resolveWifeSessionSecretForSubject,
} from '../../security/wifeSessionServerStore.ts';
import { buildAccessSetCookie } from '../../security/sessionCookie.ts';
import { resetCsrfServerStoreForTests } from '../../security/csrfServerStore.ts';

describe('logout route', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetCsrfServerStoreForTests();
    resetStolenTokenServerForTests();
    resetWifeSessionStoreForTests();
  });

  it('clears WIFE and token registries for the subject on logout', async () => {
    const token = buildFakeJwt({
      sub: 'logout-user',
      jti: 'logout-jti-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await registerTokenSessionServer(token, 'device-logout-aa');
    const wifeSession = await issueWifeSessionForSubject('logout-user', 'device-logout-aa');

    const response = await POST(
      new Request('https://app.test/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: buildAccessSetCookie(token, true),
          'x-forwarded-proto': 'https',
        },
      }),
    );

    expect(response.status).toBe(200);
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((cookie) => cookie.includes('hami_access_token=') && cookie.includes('Max-Age=0'))).toBe(true);
    await expect(
      resolveWifeSessionSecretForSubject(wifeSession!.sessionId, 'logout-user', 'device-logout-aa'),
    ).resolves.toBeNull();

    const postLogoutVerdict = await detectStolenTokenServer(token, 'device-logout-bb');
    expect(postLogoutVerdict.status).toBe('valid');
    expect(postLogoutVerdict.reason).toBe('first-seen');
  });
});
