import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => Boolean(userId?.trim()),
    isShellAuthBypassed: () => false,
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/repositoryIntentWarm', () => ({
    warmRepositoryOnOpen: vi.fn(),
    warmRepositoryHubOnHover: vi.fn(),
    warmRepositoryDataCache: vi.fn(() => Promise.resolve([])),
    registerRepositoryWarmUserId: vi.fn(() => () => undefined),
}));

vi.mock('@/app/services/repository/repositoryPerfMetrics', () => ({
    clearRepositoryPerfMarks: vi.fn(),
    markRepositoryPerfPhase: vi.fn(),
}));

import { warmRepositoryOnOpen } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';
import { clearRepositoryPerfMarks, markRepositoryPerfPhase } from '@/app/services/repository/repositoryPerfMetrics';

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    loadRepositoryHubModule: vi.fn(() => Promise.resolve({})),
    prefetchRepositoryHubModule: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('useLawyerDashboardRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يفتح المستودع تلقائياً — intent-only حتى hover/فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(warmRepositoryOnOpen).not.toHaveBeenCalled();
    });

    it('primeRepositoryShellMount ي prefetch فقط — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.primeRepositoryShellMount();
        });

        expect(result.current.isRepositoryOpen).toBe(false);
    });

    it('يفتح المستودع الموحّد ويستدعي warmRepositoryOnOpen', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });

        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        expect(warmRepositoryOnOpen).toHaveBeenCalledWith('lawyer-1', 'notepad');
        expect(clearRepositoryPerfMarks).toHaveBeenCalledTimes(1);
        expect(markRepositoryPerfPhase).toHaveBeenCalledWith('open-request');
        expect(markRepositoryPerfPhase).toHaveBeenCalledWith('first-paint');
        expect(markRepositoryPerfPhase).toHaveBeenCalledWith('interactive');
    });

    it('لا يعيد remount عند إعادة الفتح — sessionKey ثابت', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });
        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        const sessionKey = result.current.repositorySessionKey;

        act(() => {
            result.current.closeRepository();
        });

        act(() => {
            result.current.openRepository();
        });
        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));

        expect(result.current.repositorySessionKey).toBe(sessionKey);
    });

    it('openVaultModal يفتح تبويب الوسائط', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openVaultModal();
        });

        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        expect(warmRepositoryOnOpen).toHaveBeenCalledWith('lawyer-1', 'vault');
        expect(result.current.repositoryTab).toBe('vault');
    });

    it('openVaultModal مع scanner يفعّل الماسح', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openVaultModal({ scanner: true });
        });

        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        expect(result.current.vaultOpenScanner).toBe(true);
    });

    it('يرفض الفتح بدون تسجيل دخول', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: null }));

        act(() => {
            result.current.openRepository();
        });

        expect(result.current.isRepositoryOpen).toBe(false);
    });

    it('يغلق عند dismiss-transient-overlays', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openVaultModal({ scanner: true });
        });

        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        expect(result.current.vaultOpenScanner).toBe(true);

        act(() => {
            window.dispatchEvent(
                new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'forum' } }),
            );
        });

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(result.current.vaultOpenScanner).toBe(false);
    });
});
