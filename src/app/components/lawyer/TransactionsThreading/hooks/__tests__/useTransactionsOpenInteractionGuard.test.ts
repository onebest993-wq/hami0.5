import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    OPEN_GUARD_FALLBACK_MS,
    useTransactionsOpenInteractionGuard,
} from '@/app/components/lawyer/TransactionsThreading/hooks/useTransactionsOpenInteractionGuard';

describe('useTransactionsOpenInteractionGuard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يفكّ الحماية فور pointerup بعد الفتح', () => {
        const { result, rerender } = renderHook(
            ({ open }) => useTransactionsOpenInteractionGuard(open),
            { initialProps: { open: false } },
        );

        expect(result.current).toBe(false);

        rerender({ open: true });
        expect(result.current).toBe(false);

        act(() => {
            window.dispatchEvent(new Event('pointerup'));
        });
        expect(result.current).toBe(true);
    });

    it('يفكّ الحماية بعد نافذة الاحتياط إن لم يصل pointerup', () => {
        const { result, rerender } = renderHook(
            ({ open }) => useTransactionsOpenInteractionGuard(open),
            { initialProps: { open: false } },
        );

        rerender({ open: true });
        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(OPEN_GUARD_FALLBACK_MS - 1);
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
            window.dispatchEvent(new Event('pointerup'));
        });
        expect(result.current).toBe(true);

        rerender({ open: false });
        expect(result.current).toBe(false);
    });
});
