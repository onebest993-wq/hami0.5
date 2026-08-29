import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearShellHandoffPending,
    deferShellConcealAfterHandoff,
    isShellHandoffPending,
    markShellHandoffPending,
    resetShellHandoffPendingForTests,
} from '@/app/runtime/sectionShellHandoff';

describe('deferShellConcealAfterHandoff', () => {
    afterEach(() => {
        vi.useRealTimers();
        resetShellHandoffPendingForTests();
    });

    it('يؤجّل الإغلاق حتى macrotask — يُلغى إن اكتمل تسليم الفتح', () => {
        vi.useFakeTimers();
        const conceal = vi.fn();
        const cancel = deferShellConcealAfterHandoff(conceal);
        expect(conceal).not.toHaveBeenCalled();
        cancel();
        vi.runAllTimers();
        expect(conceal).not.toHaveBeenCalled();
    });

    it('يغلق اليتيم إن لم يُلغَ التسليم', () => {
        vi.useFakeTimers();
        const conceal = vi.fn();
        deferShellConcealAfterHandoff(conceal);
        vi.runAllTimers();
        expect(conceal).toHaveBeenCalledTimes(1);
    });

    it('يحتفظ بتسليم معلّق حتى يُصفَّر', () => {
        expect(isShellHandoffPending()).toBe(false);
        markShellHandoffPending('schedule');
        expect(isShellHandoffPending('schedule')).toBe(true);
        expect(isShellHandoffPending('community')).toBe(false);
        expect(isShellHandoffPending()).toBe(true);
        clearShellHandoffPending('schedule');
        expect(isShellHandoffPending()).toBe(false);
    });
});
