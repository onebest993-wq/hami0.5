import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useCommunityForumAccess } from '../useCommunityForumAccess';
import {
    canUseForumNetworkFeatures,
    forumAccessDenialReason,
} from '@/app/services/auth/lawyerAccountStatus';
import { fetchAccountNetworkGate } from '@/app/services/auth/accountNetworkGate';
import { syncLawyerVerificationFromServer } from '@/app/services/auth/lawyerVerificationRemote';

vi.mock('@/app/context/authHooks', () => ({
    useAuthSafe: () => ({
        user: { id: 'lawyer-1', user_metadata: { verificationStatus: 'active' } },
        isLoading: false,
        hasRole: (role: string) => role === 'lawyer',
    }),
}));

vi.mock('@/app/context/authRoleUtils', () => ({
    userHasRole: () => true,
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: null }),
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', async () => {
    const actual = await vi.importActual<typeof import('@/app/services/auth/lawyerAccountStatus')>(
        '@/app/services/auth/lawyerAccountStatus',
    );
    return {
        ...actual,
        canUseNetworkFeatures: vi.fn(() => true),
        canUseForumNetworkFeatures: vi.fn(() => true),
        forumAccessDenialReason: vi.fn(() => null),
    };
});

vi.mock('@/app/services/auth/accountNetworkGate', () => ({
    fetchAccountNetworkGate: vi.fn(async () => ({
        frozen: false,
        forumBanned: false,
        freezeUntil: null,
        code: null,
        message: null,
    })),
    peekAccountNetworkGate: vi.fn(() => null),
    subscribeAccountNetworkGate: vi.fn(() => () => undefined),
}));

vi.mock('@/app/services/auth/lawyerVerificationRemote', () => ({
    syncLawyerVerificationFromServer: vi.fn(async () => undefined),
}));

describe('useCommunityForumAccess', () => {
    beforeEach(() => {
        vi.mocked(canUseForumNetworkFeatures).mockReturnValue(true);
        vi.mocked(forumAccessDenialReason).mockReturnValue(null);
        vi.mocked(syncLawyerVerificationFromServer).mockResolvedValue(undefined);
        vi.mocked(fetchAccountNetworkGate).mockResolvedValue({
            frozen: false,
            forumBanned: false,
            freezeUntil: null,
            code: null,
            message: null,
        });
    });

    it('يمنح الوصول فوراً من الحالة المحلية دون انتظار الشبكة', () => {
        vi.mocked(syncLawyerVerificationFromServer).mockImplementation(
            () => new Promise(() => undefined),
        );
        const { result } = renderHook(() =>
            useCommunityForumAccess({ lawyerShellAccess: true, fallbackUserId: null }),
        );
        expect(result.current.showLoadingShell).toBe(false);
        expect(result.current.canAccessLawyerForum).toBe(true);
        expect(result.current.forumDenial).toBeNull();
        expect(result.current.currentUserId).toBe('lawyer-1');
    });

    it('يعرض قيد التدقيق فوراً دون انتظار مزامنة الخادم', () => {
        vi.mocked(canUseForumNetworkFeatures).mockReturnValue(false);
        vi.mocked(forumAccessDenialReason).mockReturnValue('pending');
        vi.mocked(syncLawyerVerificationFromServer).mockImplementation(
            () => new Promise(() => undefined),
        );
        vi.mocked(fetchAccountNetworkGate).mockImplementation(
            () => new Promise(() => undefined),
        );
        const { result } = renderHook(() =>
            useCommunityForumAccess({ lawyerShellAccess: true, fallbackUserId: null }),
        );
        expect(result.current.showLoadingShell).toBe(false);
        expect(result.current.canAccessLawyerForum).toBe(false);
        expect(result.current.forumDenial).toBe('pending');
    });
});
