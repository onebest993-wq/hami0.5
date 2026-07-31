import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    getLiveAuthUserId,
    resolveLiveAuthUserIdForStorage,
    setLiveAuthUserId,
} from '@/app/utils/liveAuthUserId';

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: null, session: null })),
    readDevMockUser: vi.fn(() => null),
}));

import { readDevMockUser, readPersistedSupabaseAuth } from '@/app/utils/authStorage';

describe('liveAuthUserId', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
        vi.mocked(readPersistedSupabaseAuth).mockReturnValue({ user: null, session: null });
        vi.mocked(readDevMockUser).mockReturnValue(null);
    });

    it('prefers live mirror over storage', () => {
        vi.mocked(readPersistedSupabaseAuth).mockReturnValue({
            user: { id: 'persisted-1' } as never,
            session: null,
        });
        setLiveAuthUserId('live-9');
        expect(getLiveAuthUserId()).toBe('live-9');
        expect(resolveLiveAuthUserIdForStorage()).toBe('live-9');
    });

    it('falls back to persisted then mock', () => {
        vi.mocked(readPersistedSupabaseAuth).mockReturnValue({
            user: { id: 'persisted-1' } as never,
            session: null,
        });
        expect(resolveLiveAuthUserIdForStorage()).toBe('persisted-1');
        vi.mocked(readPersistedSupabaseAuth).mockReturnValue({ user: null, session: null });
        vi.mocked(readDevMockUser).mockReturnValue({ id: 'mock-2' } as never);
        expect(resolveLiveAuthUserIdForStorage()).toBe('mock-2');
    });
});
