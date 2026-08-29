import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    getLiveAuthUserId,
    resolveLiveAuthUserIdForStorage,
    setLiveAuthUserId,
} from '@/app/utils/liveAuthUserId';
import {
    getUserIdentityUiState,
    publishUserIdentityUiState,
    resetUserIdentityUiStateForTests,
} from '@/app/services/profile/userIdentityUiState';
import {
    isLawyerProfileBootWarmPending,
    setLawyerProfileBootWarmPending,
} from '@/app/services/profile/profileBootWarmPending';

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: null, session: null })),
    readDevMockUser: vi.fn(() => null),
}));

import { readDevMockUser, readPersistedSupabaseAuth } from '@/app/utils/authStorage';

describe('liveAuthUserId', () => {
    beforeEach(() => {
        resetUserIdentityUiStateForTests();
        setLawyerProfileBootWarmPending(false);
        setLiveAuthUserId(null);
        document.documentElement.removeAttribute('data-hami-forum-open');
        document.documentElement.removeAttribute('data-hami-forum-closing');
        document.documentElement.removeAttribute('data-hami-forum-enter');
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

    it('يصفّر هوية الواجهة عند تبديل الحساب لا عند أول ملء', () => {
        setLiveAuthUserId(null);
        publishUserIdentityUiState({
            userId: 'lawyer-a',
            displayName: 'أحمد مهدي',
            avatarUrl: '',
            profileInitial: 'أ',
            isLoaded: true,
        });
        setLiveAuthUserId('lawyer-a');
        expect(getUserIdentityUiState('lawyer-a')?.displayName).toBe('أحمد مهدي');
        setLawyerProfileBootWarmPending(true);
        setLiveAuthUserId('lawyer-b');
        expect(getUserIdentityUiState('lawyer-a')).toBeNull();
        expect(getUserIdentityUiState('lawyer-b')).toBeNull();
        expect(isLawyerProfileBootWarmPending()).toBe(false);
    });

    it('يخفي ستارة المنتدى العالقة عند تبديل الحساب', async () => {
        document.documentElement.setAttribute('data-hami-forum-open', '1');
        document.documentElement.setAttribute('data-hami-forum-closing', '1');
        setLiveAuthUserId('lawyer-a');
        setLiveAuthUserId('lawyer-b');
        await vi.waitFor(() => {
            expect(document.documentElement.hasAttribute('data-hami-forum-open')).toBe(false);
            expect(document.documentElement.hasAttribute('data-hami-forum-closing')).toBe(false);
        });
    });
});
