import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { publishFinancialCenterTimelineNote } from '../financialCenterTimeline';
import { HAMI_APPEND_EXECUTION_TIMELINE } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';

describe('publishFinancialCenterTimelineNote', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('dispatches persisted timeline append event for financial center actions', () => {
        const handler = vi.fn();
        window.addEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);

        publishFinancialCenterTimelineNote('exec-99', '💰 تم التسديد', 'مبلغ 50,000 د.ع', 'payment');

        expect(handler).toHaveBeenCalledTimes(1);
        const ce = handler.mock.calls[0][0] as CustomEvent;
        expect(ce.detail.executionId).toBe('exec-99');
        expect(ce.detail.event.title).toBe('💰 تم التسديد');
        expect(ce.detail.event.type).toBe('payment');
        expect(ce.detail.event.source).toBe('إدارة الأموال والمصاريف');

        window.removeEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
    });

    it('ignores empty execution id', () => {
        const handler = vi.fn();
        window.addEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
        publishFinancialCenterTimelineNote(undefined, 'test', 'body');
        expect(handler).not.toHaveBeenCalled();
        window.removeEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
    });
});
