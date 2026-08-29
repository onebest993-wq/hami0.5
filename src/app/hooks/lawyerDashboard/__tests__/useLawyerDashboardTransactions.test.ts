import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { LAWYER_TRANSACTIONS_OPEN_KEY } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { removeTransactionsInstantChrome } from '@/app/runtime/transactionsInstantPaint';
import {
    markShellHandoffPending,
    resetShellHandoffPendingForTests,
} from '@/app/runtime/sectionShellHandoff';

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
    hasLocalAppSession: (userId: string | null | undefined) => Boolean(userId?.trim()),
    resolveShellAuthUserId: (auth?: string | null, display?: string | null) =>
        auth?.trim() || display?.trim() || null,
    isShellAuthBypassed: () => false,
}));

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    warmTransactionsThreadingStore: vi.fn(() => Promise.resolve()),
    ensureTransactionsUserBound: vi.fn(),
}));

vi.mock('@/app/services/transactions/transactionsDiskWarm', () => ({
    warmTransactionsDiskRead: vi.fn(),
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
        document.documentElement.removeAttribute('data-hami-transactions-open');
        document.documentElement.removeAttribute('data-hami-transactions-closing');
        document.documentElement.removeAttribute('data-hami-tx-enter');
        removeTransactionsInstantChrome();
        document.getElementById('hami-overlay-portal')?.remove();
        delete document.documentElement.dataset.hamiLite;
        delete document.documentElement.dataset.hamiNative;
        try {
            sessionStorage.removeItem(LAWYER_TRANSACTIONS_OPEN_KEY);
        } catch {
            /* ignore */
        }
        resetShellHandoffPendingForTests();
    });

    it('لا يغلق ستارة المعاملات فوراً عند التركيب (handoff)', async () => {
        document.documentElement.setAttribute('data-hami-transactions-open', '1');
        markShellHandoffPending('transactions');

        renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBe('1');
        await act(async () => {
            await new Promise<void>((r) => setTimeout(r, 0));
        });
        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBe('1');
    });

    it('يغلق ستارة المعاملات اليتيمة بعد macrotask إن لم يكن هناك تسليم', async () => {
        document.documentElement.setAttribute('data-hami-transactions-open', '1');

        renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBe('1');
        await act(async () => {
            await new Promise<void>((r) => setTimeout(r, 0));
        });
        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBeNull();
    });

    it('يفتح مركز المعاملات', async () => {
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
        expect(warmTransactionsDiskRead).toHaveBeenCalledWith('lawyer-1');
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

    it('يسخّن القرص فور جلسة محلية دون تركيب Host — بما فيها الضيف', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'guest-lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        expect(result.current.showTransactions).toBe(false);
        expect(warmTransactionsDiskRead).toHaveBeenCalledWith('guest-lawyer-1');
    });

    it('يمسح focus عند إعادة فتح hub بدون focusId وهو مفتوح', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        act(() => {
            result.current.openTransactionsHub('tx-focus');
        });
        expect(result.current.transactionsFocusId).toBe('tx-focus');

        act(() => {
            result.current.openTransactionsHub();
        });

        expect(result.current.transactionsFocusId).toBeUndefined();
    });

    it('يغلق ويمسح focus عند dismiss-transient-overlays', async () => {
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

        await waitFor(() => expect(result.current.showTransactions).toBe(false));
        expect(result.current.transactionsFocusId).toBeUndefined();
    });

    it('يضع علم html عند الفتح ويزيله عند الإغلاق', async () => {
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
        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBe('1');

        act(() => {
            result.current.closeTransactionsHub();
        });
        expect(document.documentElement.hasAttribute('data-hami-transactions-open')).toBe(false);
        await waitFor(() => expect(result.current.showTransactions).toBe(false));
    });

    it('يفك الطبقة عند الإغلاق على الأصل وسطح المكتب', async () => {
        const run = async () => {
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

            act(() => {
                result.current.closeTransactionsHub();
            });
            await waitFor(() => expect(result.current.showTransactions).toBe(false));
        };

        document.documentElement.dataset.hamiNative = '1';
        await run();
        delete document.documentElement.dataset.hamiNative;
        await run();
    });

    it('لمسة prime لا تركّب Host', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardTransactions({
                userId: 'lawyer-1',
                setArchiveType: vi.fn(),
                setShowLawsuitsWorkspace: vi.fn(),
            }),
        );

        act(() => {
            result.current.primeTransactionsHubMount();
        });
        expect(result.current.showTransactions).toBe(false);
        expect(warmTransactionsDiskRead).toHaveBeenCalledWith('lawyer-1');
    });

    it('يغلق المركز عند فقدان الجلسة المحلية', async () => {
        const { result, rerender } = renderHook(
            ({ userId }: { userId: string | null }) =>
                useLawyerDashboardTransactions({
                    userId,
                    setArchiveType: vi.fn(),
                    setShowLawsuitsWorkspace: vi.fn(),
                }),
            { initialProps: { userId: 'lawyer-1' as string | null } },
        );

        act(() => {
            result.current.openTransactionsHub();
        });
        await waitFor(() => expect(result.current.showTransactions).toBe(true));

        rerender({ userId: null });
        expect(result.current.showTransactions).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-transactions-open')).toBe(false);
    });
});
