import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserByIdMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('./supabaseAdminClient.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabaseAdminClient.ts')>();
  return {
    ...actual,
    getSupabaseAdminClient: () => ({
      from: () => ({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            maybeSingle: maybeSingleMock,
          }),
        }),
      }),
      auth: {
        admin: {
          getUserById: (...args: unknown[]) => getUserByIdMock(...args),
        },
      },
    }),
  };
});

import {
  canAccessLawyerForumUserId,
  getProfileRole,
  isConfiguredAdminEmail,
  isForumModeratorUserId,
  isPlatformAdminUserId,
  resetRoleResolverCacheForTests,
} from './roleResolver.ts';

describe('roleResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRoleResolverCacheForTests();
    delete process.env.ADMIN_UUID;
    getUserByIdMock.mockResolvedValue({ data: { user: { email: 'lawyer@example.com' } }, error: null });
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
    expect(getUserByIdMock).not.toHaveBeenCalled();
  });

  it('returns true for the canonical platform UUID even when ADMIN_UUID differs', async () => {
    process.env.ADMIN_UUID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
    await expect(isPlatformAdminUserId('a2532b41-add9-463f-9447-b6f933a79fea')).resolves.toBe(true);
    expect(getUserByIdMock).not.toHaveBeenCalled();
  });

  it('returns true when GoTrue email is the platform master mailbox', async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: { email: 'Hami.Apps@proton.me' } },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
    expect(isConfiguredAdminEmail('hami.apps@proton.me')).toBe(true);
    await expect(isPlatformAdminUserId('live-admin-uuid-not-in-env')).resolves.toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns true from live session email without GoTrue admin lookup', async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
    await expect(isPlatformAdminUserId('any-live-uuid', 'Hami.Apps@proton.me')).resolves.toBe(true);
    expect(getUserByIdMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('does not treat a random mailbox as platform admin', async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: { email: 'other.lawyer@gmail.com' } },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
    await expect(isPlatformAdminUserId('live-lawyer-uuid')).resolves.toBe(false);
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

  it('denies forum access for inactive profiles', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { role: 'lawyer', is_banned: true, is_deleted: false, is_active: true },
      error: null,
    });
    await expect(getProfileRole('banned-user')).resolves.toBeNull();
    await expect(canAccessLawyerForumUserId('banned-user')).resolves.toBe(false);
  });

  it('allows forum access for active lawyer profiles', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { role: 'lawyer', is_banned: false, is_deleted: false, is_active: true },
      error: null,
    });
    await expect(canAccessLawyerForumUserId('lawyer-1')).resolves.toBe(true);
  });

  it('allows forum access for the canonical platform admin UUID without a lawyer profile', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    await expect(canAccessLawyerForumUserId('a2532b41-add9-463f-9447-b6f933a79fea')).resolves.toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });
});
