import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('./supabaseAdminClient.ts', () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: selectMock.mockReturnValue({
        eq: eqMock.mockReturnValue({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  }),
}));

import {
  getProfileRole,
  isForumModeratorUserId,
  isPlatformAdminUserId,
  resetRoleResolverCacheForTests,
} from './roleResolver.ts';

describe('roleResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRoleResolverCacheForTests();
    delete process.env.ADMIN_UUID;
  });

  it('returns false for platform admin when profile is lawyer', async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
    await expect(isPlatformAdminUserId('user-1')).resolves.toBe(false);
  });

  it('returns true for profiles.role admin', async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: 'admin' }, error: null });
    await expect(isPlatformAdminUserId('user-2')).resolves.toBe(true);
  });

  it('returns true for ADMIN_UUID env match', async () => {
    process.env.ADMIN_UUID = 'fixed-admin-id';
    await expect(isPlatformAdminUserId('fixed-admin-id')).resolves.toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('treats moderator as forum admin but not platform admin', async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: 'moderator' }, error: null });
    await expect(isPlatformAdminUserId('mod-1')).resolves.toBe(false);
    await expect(isForumModeratorUserId('mod-1')).resolves.toBe(true);
  });

  it('does not treat user_metadata role as platform admin', async () => {
    process.env.ADMIN_UUID = 'other-admin';
    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
    await expect(isPlatformAdminUserId('attacker-with-fake-meta')).resolves.toBe(false);
  });
});
