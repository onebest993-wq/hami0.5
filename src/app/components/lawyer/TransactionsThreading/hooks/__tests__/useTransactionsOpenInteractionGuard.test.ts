import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionsOpenInteractionGuard } from '@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsOpenInteractionGuard';

describe('useTransactionsOpenInteractionGuard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يبقى غير تفاعلي حتى انتهاء نافذة الحماية بعد الفتح', () => {
        const { result, rerender } = renderHook(
            ({ open }) => useTransactionsOpenInteractionGuard(open),
            { initialProps: { open: false } },
        );

        expect(result.current).toBe(false);

        rerender({ open: true });
        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(419);
        });
        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe(true);
    });

    it('يعيد التعطيل عند إغلاق hub', () => {
        const { result, rerender } = renderHook(
            ({ open }) => useTransactionsOpenInteractionGuard(open),
            { initialProps: { open: true } },
        );

        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe(true);

        rerender({ open: false });
        expect(result.current).toBe(false);
    });
});
