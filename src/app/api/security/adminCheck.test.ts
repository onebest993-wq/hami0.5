import { describe, expect, it, vi, beforeEach } from 'vitest';

const fetchGoTrueUserMock = vi.hoisted(() => vi.fn());
const isPlatformAdminUserIdMock = vi.hoisted(() => vi.fn());

vi.mock('../auth/goTrueSession.ts', () => ({
  fetchGoTrueUser: (...args: unknown[]) => fetchGoTrueUserMock(...args),
}));

vi.mock('./roleResolver.ts', () => ({
  isPlatformAdminUserId: (...args: unknown[]) => isPlatformAdminUserIdMock(...args),
}));

import { isAdminRequest, isAdminUserId } from './adminCheck.ts';

describe('isAdminUserId', () => {
  beforeEach(() => {
    fetchGoTrueUserMock.mockReset();
    isPlatformAdminUserIdMock.mockReset();
    isPlatformAdminUserIdMock.mockResolvedValue(false);
  });

  it('passes live GoTrue email from the access token', async () => {
    fetchGoTrueUserMock.mockResolvedValue({ email: 'hami.apps@proton.me' });
    isPlatformAdminUserIdMock.mockResolvedValue(true);
    await expect(isAdminUserId('live-uuid', 'access-token')).resolves.toBe(true);
    expect(fetchGoTrueUserMock).toHaveBeenCalledWith('access-token');
    expect(isPlatformAdminUserIdMock).toHaveBeenCalledWith('live-uuid', 'hami.apps@proton.me');
  });

  it('still resolves without a token', async () => {
    await expect(isAdminUserId('live-uuid')).resolves.toBe(false);
    expect(fetchGoTrueUserMock).not.toHaveBeenCalled();
    expect(isPlatformAdminUserIdMock).toHaveBeenCalledWith('live-uuid', null);
  });

  it('isAdminRequest forwards the session cookie to live email lookup', async () => {
    fetchGoTrueUserMock.mockResolvedValue({ email: 'hami.apps@proton.me' });
    isPlatformAdminUserIdMock.mockResolvedValue(true);
    const request = new Request('https://app.test/api/admin/otp/request', {
      headers: { cookie: 'hami_access_token=access-token' },
    });
    await expect(isAdminRequest(request, 'live-uuid')).resolves.toBe(true);
    expect(fetchGoTrueUserMock).toHaveBeenCalledWith('access-token');
    expect(isPlatformAdminUserIdMock).toHaveBeenCalledWith('live-uuid', 'hami.apps@proton.me');
  });
});
