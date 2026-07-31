import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { LAWYER_TRANSACTIONS_OPEN_KEY } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => {
        const id = userId?.trim();
        if (!id) return false;
        return id !== 'guest-lawyer-1' && id !== 'demo_user';
    },
    resolveShellAuthUserId: (auth?: string | null, display?: string | null) =>
        auth?.trim() || display?.trim() || null,
    isShellAuthBypassed: () => false,
}));

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    warmTransactionsThreadingStore: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn((work: () => void) => {
        work();
        return () => undefined;
    }),
}));

vi.mock('@/app/utils/lazyComponents', () => ({
    prefetchTransactionsHub: vi.fn(),
}));

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    loadTransactionsHubModule: vi.fn(() => Promise.resolve({})),
    prefetchTransactionsHubModule: vi.fn(),
}));

vi.mock('@/app/runtime/transactionsBootHydrator', () => ({
    hydrateTransactionsBootShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    prefetchTransactionsAfterBootReveal: vi.fn(),
    bindTransactionsBootHydrator: vi.fn(() => () => undefined),
    dispatchTransactionsPrimeHost: vi.fn(),
}));

describe('useLawyerDashboardTransactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        try {
            sessionStorage.removeItem(LAWYER_TRANSACTIONS_OPEN_KEY);
        } catch {
            /* ignore */
        }
    });

    it('يفتح مركز المعاملات ويُجهّز host', async () => {
        const setArchiveType = vi.fn();
        const setShowLawsuitsWorkspace = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType,
                setShowLawsuitsWorkspace,
            }),
        );

        act(() => {
            result.current.openTransactionsHub();
        });

        await waitFor(() => expect(result.current.showTransactions).toBe(true));
        expect(result.current.transactionsHostMounted).toBe(true);
        expect(result.current.transactionsSessionKey).toBe(0);
        expect(setArchiveType).toHaveBeenCalledWith(null);
        expect(setShowLawsuitsWorkspace).toHaveBeenCalledWith(false);
    });

    it('لا يعيد remount عند إعادة فتح مركز المعاملات', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        act(() => {
            result.current.openTransactionsHub();
        });
        await waitFor(() => expect(result.current.showTransactions).toBe(true));
        const sessionKey = result.current.transactionsSessionKey;

        act(() => {
            result.current.closeTransactionsHub();
        });

        act(() => {
            result.current.openTransactionsHub();
        });
        await waitFor(() => expect(result.current.showTransactions).toBe(true));

        expect(result.current.transactionsSessionKey).toBe(sessionKey);
    });

    it('يرفض الفتح بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: null,
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        act(() => {
            result.current.openTransactionsHub();
        });

        expect(result.current.showTransactions).toBe(false);
    });

    it('يُركّب host مخفياً فور تسجيل الدخول (مثل الإعدادات)', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        expect(result.current.transactionsHostMounted).toBe(true);
        expect(result.current.showTransactions).toBe(false);
    });

    it('يغلق ويمسح focus عند dismiss-transient-overlays', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        act(() => {
            result.current.setShowTransactions(true);
            result.current.setTransactionsFocusId('tx-1');
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.showTransactions).toBe(false);
        expect(result.current.transactionsFocusId).toBeUndefined();
    });
});
