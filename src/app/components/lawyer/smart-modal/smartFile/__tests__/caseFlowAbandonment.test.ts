import { describe, expect, it } from 'vitest';
import { resolveAbandonmentFlowAction } from '../caseFlowAbandonment';

describe('caseFlowAbandonment', () => {
    it('shows first-time abandon during open pleadings', () => {
        expect(resolveAbandonmentFlowAction({ isPleadingsClosed: false })).toEqual({
            show: true,
            label: 'ترك الدعوى للمراجعة',
            isSecondAttempt: false,
        });
    });

    it('shows second-time warning after prior abandon was resumed', () => {
        expect(
            resolveAbandonmentFlowAction({ abandonmentCount: 1, isPleadingsClosed: false }),
        ).toMatchObject({
            show: true,
            isSecondAttempt: true,
        });
    });

    it('hides while already abandoned or pleadings closed', () => {
        expect(resolveAbandonmentFlowAction({ abandonmentDate: '2026-01-01' }).show).toBe(false);
        expect(resolveAbandonmentFlowAction({ isPleadingsClosed: true }).show).toBe(false);
        expect(resolveAbandonmentFlowAction({ isVoided: true }).show).toBe(false);
    });
});
