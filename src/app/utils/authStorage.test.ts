import { beforeEach, describe, expect, it } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import {
  clearDevMockAuth,
  clearStaleDevMockFromSupabaseStorage,
  hasPersistedSupabaseSession,
  isDevMockAccessToken,
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
});
