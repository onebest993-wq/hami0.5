import { describe, expect, it } from 'vitest';
import {
    buildEndGracePeriodMergePatch,
    buildExecutionFeeGraceEndEvent,
    buildGracePeriodEndedTimelineEvent,
    computeForcedDebtorNotificationYmd,
} from '../executionDashboardGraceSummoning';

describe('executionDashboardGraceSummoning', () => {
    it('computeForcedDebtorNotificationYmd shifts anchor 8 days back', () => {
        const ymd = computeForcedDebtorNotificationYmd('2026-06-20', new Date('2026-06-26'));
        expect(ymd).toBe('2026-06-12');
    });

    it('buildEndGracePeriodMergePatch injects fee when not yet injected', () => {
        const result = buildEndGracePeriodMergePatch(false, 150_000);
        expect(result.injectExecutionFee).toBe(true);
        expect(result.mergePatch.executionFeeInjected).toBe(true);
        expect(result.feeEvent?.type).toBe('payment');
    });

    it('buildEndGracePeriodMergePatch skips fee when already injected', () => {
        const result = buildEndGracePeriodMergePatch(true, 150_000);
        expect(result.injectExecutionFee).toBe(false);
        expect(result.feeEvent).toBeNull();
    });

    it('buildGracePeriodEndedTimelineEvent is coercive type', () => {
        const ev = buildGracePeriodEndedTimelineEvent('test');
        expect(ev.id).toBe('grace_end_test');
        expect(ev.type).toBe('coercive');
    });

    it('buildExecutionFeeGraceEndEvent includes formatted fee in description', () => {
        const ev = buildExecutionFeeGraceEndEvent(3000, 'x');
        expect(ev.id).toBe('fee_end_grace_x');
        expect(ev.description).toContain('3');
    });
});
