import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    appealWindowDaysElapsedFromIssueYmd,
    appealWindowsForDecision,
    buildAppealPerpetualEnforcementPatch,
    buildGrievanceDeadlineLapsePatch,
    buildManualExecutorAppealFilePatch,
    reconcileAppealDeadlineEnforcement,
    resolveAppealDeadlineExpiryKind,
    resolveAppealLastDeadlineYmd,
    resolveCassationAppealClockYmd,
    decisionAppealClockYmd,
    resolveManualExecutorWorkflowPhase,
    shouldShowAppealDeadlineLapseActions,
} from '../utils';
import type { Decision } from '../types';

function base(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'd1',
        title: 'قرار تنفيذي',
        body: '',
        date: '2026-06-01',
        appealStatus: 'pending',
        ...overrides,
    };
}

describe('decisionAppealClockYmd — تاريخ الإصدار القانوني', () => {
    it('يُفضَّل حقل date على resolvedAt لتجنب انزياح UTC', () => {
        expect(
            decisionAppealClockYmd({
                date: '2026-06-25',
                resolvedAt: '2026-06-24T21:00:00.000Z',
            }),
        ).toBe('2026-06-25');
    });
});

describe('appealWindowDaysElapsedFromIssueYmd — من يوم الإصدار', () => {
    it('يوم الإصدار = اليوم 0', () => {
        expect(appealWindowDaysElapsedFromIssueYmd('2026-06-01', new Date('2026-06-01'))).toBe(0);
    });

    it('اليوم التالي = اليوم 1', () => {
        expect(appealWindowDaysElapsedFromIssueYmd('2026-06-01', new Date('2026-06-02'))).toBe(1);
    });
});

describe('appealWindowsForDecision — تظلم 3 / تمييز 7 من يوم الإصدار', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يوم الإصدار: تظلم وتمييز مفتوحان', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-01T12:00:00'));
        const w = appealWindowsForDecision(base());
        expect(w.canTadhallum).toBe(true);
        expect(w.canTamyeez).toBe(true);
        expect(w.grievanceDaysElapsed).toBe(0);
    });

    it('اليوم 2–3: مهلة التظلم (3 أيام)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-03T12:00:00'));
        const w = appealWindowsForDecision(base());
        expect(w.canTadhallum).toBe(true);
        expect(w.grievanceDaysElapsed).toBe(2);
    });

    it('اليوم 4: انتهى التظلم — التمييز ما زال مفتوحاً', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00'));
        const w = appealWindowsForDecision(base());
        expect(w.canTadhallum).toBe(false);
        expect(w.isPastGrievanceDeadline).toBe(true);
        expect(w.canTamyeez).toBe(true);
    });

    it('بعد نتيجة التظلم تُعاد ساعة التمييز من تاريخ إصدار قرار التظلم', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-09T12:00:00'));
        const row = base({
            manualExecutorLedgerEntry: true,
            manualExecutorWorkflowPhase: 'cassation_unlocked',
            manualExecutorGrievanceOutcome: 'rejected',
            grievanceOutcomeIssuedYmd: '2026-06-03',
            cassationAppealClockYmd: '2026-06-03',
        });
        expect(resolveCassationAppealClockYmd(row)).toBe('2026-06-03');
        const w = appealWindowsForDecision(row);
        expect(w.cassationDaysElapsed).toBe(6);
        expect(w.canTamyeez).toBe(true);
    });

    it('queue request after grievance rejection uses outcome clock for cassation window', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-09T12:00:00'));
        const row = base({
            requestKind: 'seizure',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'rejected',
            appealResult: 'رد التظلم',
            appealStatus: 'pending',
            grievanceRejectedAwaitingTamyeez: true,
            awaitingCassationEntryBy: 'lawyer',
            grievanceOutcomeIssuedYmd: '2026-06-03',
            cassationAppealClockYmd: '2026-06-03',
        });
        expect(resolveCassationAppealClockYmd(row)).toBe('2026-06-03');
        const w = appealWindowsForDecision(row);
        expect(w.canTamyeez).toBe(true);
    });
});

describe('resolveAppealLastDeadlineYmd', () => {
    it('آخر يوم تظلم من يوم الإصدار', () => {
        expect(resolveAppealLastDeadlineYmd('tadhallum', '2026-06-01', '')).toBe('2026-06-03');
    });

    it('آخر يوم تمييز من يوم الإصدار', () => {
        expect(resolveAppealLastDeadlineYmd('tamyeez', '2026-06-01', '2026-06-01')).toBe('2026-06-07');
    });
});

describe('resolveAppealDeadlineExpiryKind — يوم الانتهاء فقط', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يوم انتهاء التمييز بالضبط — تظهر اللوحة', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T12:00:00'));
        const row = base({ manualExecutorLedgerEntry: true, executorDecisionStatusFlag: 1 });
        expect(resolveAppealDeadlineExpiryKind(row)).toBe('cassation');
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(true);
    });

    it('بعد يوم انتهاء التمييز — لا تظهر اللوحة', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-09T12:00:00'));
        const row = base({ manualExecutorLedgerEntry: true, executorDecisionStatusFlag: 1 });
        expect(resolveAppealDeadlineExpiryKind(row)).toBeNull();
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });

    it('قبل يوم انتهاء التمييز — لا تظهر اللوحة', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-07T12:00:00'));
        const row = base({ manualExecutorLedgerEntry: true, executorDecisionStatusFlag: 1 });
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });

    it('يوم انتهاء التظلم مع تظلم معلّق — تظهر لوحة التظلم', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-04T12:00:00'));
        const row = base({
            manualExecutorLedgerEntry: true,
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
        });
        expect(resolveAppealDeadlineExpiryKind(row)).toBe('grievance');
    });
});

describe('reconcileAppealDeadlineEnforcement', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('لا يُؤرشف تلقائياً في يوم انتهاء التمييز', () => {
        const row = base({
            manualExecutorLedgerEntry: true,
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'cassation_pending',
        });
        const { rows, mutated } = reconcileAppealDeadlineEnforcement([row]);
        expect(mutated).toBe(false);
        expect(rows[0].appealDeadlinePerpetuallyEnforced).toBeFalsy();
    });

    it('تظلم معلّق في يوم انتهاء التظلم — يُغلق تلقائياً', () => {
        vi.setSystemTime(new Date('2026-06-04T12:00:00'));
        const row = base({
            manualExecutorLedgerEntry: true,
            executorDecisionStatusFlag: 2,
            manualExecutorAppealKind: 'tadhallum',
            manualExecutorWorkflowPhase: 'grievance_pending',
        });
        const { rows, mutated } = reconcileAppealDeadlineEnforcement([row]);
        expect(mutated).toBe(true);
        expect(resolveManualExecutorWorkflowPhase(rows[0])).toBe('cassation_unlocked');
    });
});

describe('buildManualExecutorAppealFilePatch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-03T12:00:00'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يُسجّل تاريخ التظلم دون ضبط ساعة التمييز (تُضبط عند نتيجة التظلم)', () => {
        const patch = buildManualExecutorAppealFilePatch(
            base({ manualExecutorLedgerEntry: true }),
            'lawyer',
            'tadhallum'
        );
        expect(patch.grievanceIssuedYmd).toBe('2026-06-03');
        expect(patch.cassationAppealClockYmd).toBeUndefined();
    });
});

describe('buildAppealPerpetualEnforcementPatch', () => {
    it('يُؤرشف عند إنهاء المدة يدوياً', () => {
        const patch = buildAppealPerpetualEnforcementPatch(
            base({ manualExecutorLedgerEntry: true, executorDecisionStatusFlag: 2 })
        );
        expect(patch.appealDeadlinePerpetuallyEnforced).toBe(true);
        expect(patch.isArchived).toBe(true);
    });
});

describe('buildGrievanceDeadlineLapsePatch', () => {
    it('يُضيف سجل زمني لسقوط التظلم', () => {
        const patch = buildGrievanceDeadlineLapsePatch(
            base({
                manualExecutorLedgerEntry: true,
                executorDecisionStatusFlag: 2,
                manualExecutorWorkflowPhase: 'grievance_pending',
            }),
            []
        );
        expect(patch.appealTimelineLogs?.[0]?.message).toMatch(/3 أيام/);
    });
});
