import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUBJECT = 'user-wife-session-route';
const DEVICE_ID = 'routewife000000001';

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
  return {
    ...actual,
    requireWifeUser: vi.fn(async () => ({ ok: true as const, userId: 'user-wife-session-route' })),
  };
});

import { resetCsrfServerStoreForTests } from '../../security/csrfServerStore.ts';
import {
  issueWifeSessionForSubject,
  resolveWifeSessionSecretForSubject,
  resetWifeSessionStoreForTests,
} from '../../security/wifeSessionServerStore.ts';
import { DELETE, GET } from './route.ts';

describe('wife-session route lifecycle', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetCsrfServerStoreForTests();
    resetWifeSessionStoreForTests();
  });

  it('does not bootstrap CSRF or a client signing secret on GET', async () => {
    const res = await GET(new Request('https://app.test/api/security/wife-session', { method: 'GET' }));
    const payload = (await res.json()) as {
      csrfToken?: string;
      sessionSecret?: string;
      ok?: boolean;
    };
    expect(res.status).toBe(405);
    expect(payload.ok).toBe(false);
    expect(payload.csrfToken).toBeUndefined();
    expect(payload.sessionSecret).toBeUndefined();
    expect(res.headers.get('allow')).toBe('DELETE');
  });

  it('deletes the current WIFE session and clears the CSRF cookie', async () => {
    const issued = await issueWifeSessionForSubject(SUBJECT, DEVICE_ID);
    expect(issued?.sessionId).toBeTruthy();

    const revokeReq = new Request('https://app.test/api/security/wife-session', {
      method: 'DELETE',
      headers: {
        origin: 'https://app.test',
        referer: 'https://app.test/dashboard',
        'x-wife-device-id': DEVICE_ID,
        'x-wife-session': issued!.sessionId,
        'x-csrf-token': 'csrf-token-value-1234567890',
        cookie: 'hami_csrf_token=csrf-token-value-1234567890',
      },
    });
    const revokeRes = await DELETE(revokeReq);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(
      resolveWifeSessionSecretForSubject(issued!.sessionId, SUBJECT, DEVICE_ID),
    ).resolves.toBeNull();
  });
});
