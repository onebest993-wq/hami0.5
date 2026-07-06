import { beforeEach, describe, expect, it } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import {
  clearDevMockAuth,
  clearStaleDevMockFromSupabaseStorage,
  hasPersistedSupabaseSession,
  isDevMockAccessToken,
  listSupabaseJwtStorageKeys,
  purgeClientAuthResidue,
  purgeLegacyCryptoWrapSession,
  purgePersistedSupabaseJwtFromLocalStorage,
  readDevMockAccessToken,
  readPersistedSupabaseAuth,
  writeDevMockAuth,
} from './authStorage';
import { projectId } from '@/utils/supabase/info';

function mockUser(id: string): User {
  return { id } as User;
}

function mockSession(token: string, user: User): Session {
  return { access_token: token, user } as Session;
}

describe('authStorage dev mock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects dev mock access tokens', () => {
    expect(isDevMockAccessToken('dev-access-token-admin-uuid-1')).toBe(true);
    expect(isDevMockAccessToken('eyJhbGciOiJIUzI1NiJ9')).toBe(false);
  });

  it('stores dev mock separately from supabase session', () => {
    const user = mockUser('admin-uuid-1');
    const session = mockSession('dev-access-token-admin-uuid-1', user);
    writeDevMockAuth(session);

    expect(readDevMockAccessToken()).toBe('dev-access-token-admin-uuid-1');
    expect(readPersistedSupabaseAuth().user).toBeNull();
    expect(hasPersistedSupabaseSession()).toBe(false);
  });

  it('clears stale dev mock from supabase storage key', () => {
    const key = `sb-${projectId}-auth-token`;
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'dev-access-token-admin-uuid-1',
        user: mockUser('admin-uuid-1'),
      }),
    );

    clearStaleDevMockFromSupabaseStorage();

    expect(localStorage.getItem(key)).toBeNull();
  });

  it('clearDevMockAuth removes dev keys', () => {
    writeDevMockAuth(mockSession('dev-access-token-admin-uuid-1', mockUser('admin-uuid-1')));
    clearDevMockAuth();
    expect(readDevMockAccessToken()).toBeNull();
  });

  it('purgePersistedSupabaseJwtFromLocalStorage removes sb auth keys', () => {
    const key = `sb-${projectId}-auth-token`;
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiJ9.real',
        refresh_token: 'refresh',
        user: mockUser('user-1'),
      }),
    );
    localStorage.setItem('sb-other-project-auth-token', '{"access_token":"x"}');

    expect(listSupabaseJwtStorageKeys().length).toBe(2);

    const purged = purgePersistedSupabaseJwtFromLocalStorage();
    expect(purged).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem('sb-other-project-auth-token')).toBeNull();
    expect(purgePersistedSupabaseJwtFromLocalStorage()).toBe(false);
  });

  it('purgeLegacyCryptoWrapSession clears sessionStorage wrap key', () => {
    sessionStorage.setItem('hami-crypto-session-key', '{"wrapped":"abc"}');
    expect(purgeLegacyCryptoWrapSession()).toBe(true);
    expect(sessionStorage.getItem('hami-crypto-session-key')).toBeNull();
    expect(purgeLegacyCryptoWrapSession()).toBe(false);
  });

  it('purgeClientAuthResidue removes jwt, legacy wrap, and dev mock keys together', () => {
    const key = `sb-${projectId}-auth-token`;
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiJ9.real',
        refresh_token: 'refresh',
        user: mockUser('user-1'),
      }),
    );
    writeDevMockAuth(mockSession('dev-access-token-admin-uuid-1', mockUser('admin-uuid-1')));
    sessionStorage.setItem('hami-crypto-session-key', '{"wrapped":"abc"}');

    expect(purgeClientAuthResidue()).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
    expect(readDevMockAccessToken()).toBeNull();
    expect(sessionStorage.getItem('hami-crypto-session-key')).toBeNull();
    expect(purgeClientAuthResidue()).toBe(false);
  });
});
