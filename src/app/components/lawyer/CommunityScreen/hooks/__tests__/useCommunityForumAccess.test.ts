import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCommunityForumAccess } from '../useCommunityForumAccess';

vi.mock('@/app/context/AuthContext', () => ({
    useAuthSafe: () => ({
        user: { id: 'lawyer-1', user_metadata: {} },
        isLoading: false,
        hasRole: (role: string) => role === 'lawyer',
    }),
    userHasRole: () => true,
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: null }),
}));

describe('useCommunityForumAccess', () => {
    it('يمنح الوصول من lawyerShellAccess', () => {
        const { result } = renderHook(() =>
            useCommunityForumAccess({ lawyerShellAccess: true, fallbackUserId: null }),
        );
        expect(result.current.canAccessLawyerForum).toBe(true);
        expect(result.current.currentUserId).toBe('lawyer-1');
        expect(result.current.showLoadingShell).toBe(false);
    });
});
