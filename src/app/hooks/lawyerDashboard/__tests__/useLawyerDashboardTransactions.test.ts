import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    warmTransactionsThreadingStore: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn(() => () => undefined),
}));

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    loadTransactionsHubModule: vi.fn(() => Promise.resolve({})),
}));

describe('useLawyerDashboardTransactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
