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
    scheduleRepositoryDockIdlePrefetch: vi.fn(),
}));

vi.mock('@/app/services/repository/repositoryPerfMetrics', () => ({
    clearRepositoryPerfMarks: vi.fn(),
    markRepositoryPerfPhase: vi.fn(),
}));

import { warmRepositoryOnOpen } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    loadRepositoryHubModule: vi.fn(() => Promise.resolve({})),
    prefetchRepositoryHubModule: vi.fn(),
    hydrateRepositoryShellForInstantOpen: vi.fn(() => Promise.resolve(false)),
    isRepositoryHubModuleResolved: vi.fn(() => false),
}));

vi.mock('@/app/runtime/repositoryBootHydrator', () => ({
    hydrateRepositoryBootShellForInstantOpen: vi.fn(() => Promise.resolve(false)),
    prefetchRepositoryAfterBootReveal: vi.fn(),
    bindRepositoryBootHydrator: vi.fn(() => () => undefined),
    isRepositoryShellFullyHydrated: vi.fn(() => false),
    dispatchRepositoryPrimeHost: vi.fn(),
    REPOSITORY_SHELL_HYDRATED_EVENT: 'hami:repository-shell-hydrated',
    REPOSITORY_PRIME_HOST_EVENT: 'hami:repository-prime-host',
}));

vi.mock('@/app/bootstrap/bootMetrics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/bootstrap/bootMetrics')>();
    return {
        ...actual,
        onDashboardInteractive: () => () => undefined,
        isDashboardInteractive: () => false,
    };
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('useLawyerDashboardRepository', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { resetDashboardInteractiveForTests } = await import('@/app/bootstrap/bootMetrics');
        resetDashboardInteractiveForTests();
    });

    it('لا يفتح المستودع تلقائياً — intent-only حتى hover/فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(result.current.repositoryHostMounted).toBe(false);
        expect(warmRepositoryOnOpen).not.toHaveBeenCalled();
    });

    it('primeRepositoryShellMount ي prefetch ويُجهّز المضيف — بلا فتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.primeRepositoryShellMount();
        });

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(result.current.repositoryHostMounted).toBe(true);
    });

    it('حدث hydrate يُجهّز المضيف بعد جاهزية الـ Modal', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            window.dispatchEvent(new Event('hami:repository-shell-hydrated'));
        });

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(result.current.repositoryHostMounted).toBe(true);
    });

    it('حدث prime يُجهّز المضيف قبل الفتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            window.dispatchEvent(new Event('hami:repository-prime-host'));
        });

        expect(result.current.isRepositoryOpen).toBe(false);
        expect(result.current.repositoryHostMounted).toBe(true);
    });

    it('يفتح المستودع فوراً عبر flushSync', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });

        expect(result.current.isRepositoryOpen).toBe(true);
    });

    it('يغلق المستودع فوراً عبر flushSync', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });
        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));

        act(() => {
            result.current.closeRepository();
        });

        expect(result.current.isRepositoryOpen).toBe(false);
    });

    it('يفتح المستودع الموحّد على تبويب المفكرة', async () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });

        await waitFor(() => expect(result.current.isRepositoryOpen).toBe(true));
        expect(result.current.repositoryTab).toBe('notepad');
        expect(result.current.repositoryHostMounted).toBe(true);
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
        expect(result.current.repositoryTab).toBe('vault');
        expect(result.current.repositoryHostMounted).toBe(true);
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

    it('R9: clear + open-request متزامنان قبل الفتح', () => {
        const { result } = renderHook(() => useLawyerDashboardRepository({ userId: 'lawyer-1' }));

        act(() => {
            result.current.openRepository();
        });

        expect(clearRepositoryPerfMarks).toHaveBeenCalled();
        expect(markRepositoryPerfPhase).toHaveBeenCalledWith('open-request');
        const clearOrder = (clearRepositoryPerfMarks as ReturnType<typeof vi.fn>).mock
            .invocationCallOrder[0];
        const markOrder = (markRepositoryPerfPhase as ReturnType<typeof vi.fn>).mock.invocationCallOrder.find(
            (_: number, i: number) =>
                (markRepositoryPerfPhase as ReturnType<typeof vi.fn>).mock.calls[i]?.[0] ===
                'open-request',
        );
        expect(clearOrder).toBeLessThan(markOrder ?? Number.POSITIVE_INFINITY);
        expect(result.current.isRepositoryOpen).toBe(true);
    });

    it('R2: يمسح host ويغلق عند غياب هوية', async () => {
        const { result, rerender } = renderHook(
            ({ userId }: { userId: string | null }) => useLawyerDashboardRepository({ userId }),
            { initialProps: { userId: 'lawyer-1' as string | null } },
        );

        act(() => {
            result.current.openRepository();
        });
        expect(result.current.isRepositoryOpen).toBe(true);
        expect(result.current.repositoryHostMounted).toBe(true);

        rerender({ userId: null });

        await waitFor(() => {
            expect(result.current.isRepositoryOpen).toBe(false);
            expect(result.current.repositoryHostMounted).toBe(false);
        });
    });
});
