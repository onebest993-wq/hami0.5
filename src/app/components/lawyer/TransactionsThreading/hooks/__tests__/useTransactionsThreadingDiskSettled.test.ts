import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionsThreadingDiskSettled } from '@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsThreadingDiskSettled';

const isUnread = vi.fn(() => true);

vi.mock('@/app/services/transactions/transactionsDiskWarm', () => ({
    isTransactionsThreadingDiskUnread: (...args: unknown[]) => isUnread(...args),
    subscribeTransactionsThreadingDiskReady: (onReady: () => void) => {
        window.addEventListener('hami:tx-threading-disk-ready', onReady);
        return () => window.removeEventListener('hami:tx-threading-disk-ready', onReady);
    },
}));

describe('useTransactionsThreadingDiskSettled', () => {
    beforeEach(() => {
        isUnread.mockReturnValue(true);
    });

    it('يبقى غير جاهز حتى حدث فك القرص', () => {
        const { result } = renderHook(() => useTransactionsThreadingDiskSettled('lawyer-1'));
        expect(result.current).toBe(false);
        act(() => {
            window.dispatchEvent(new Event('hami:tx-threading-disk-ready'));
        });
        expect(result.current).toBe(true);
    });

    it('جاهز فوراً إن لم يكن المفتاح unread', () => {
        isUnread.mockReturnValue(false);
        const { result } = renderHook(() => useTransactionsThreadingDiskSettled('lawyer-1'));
        expect(result.current).toBe(true);
    });
});
