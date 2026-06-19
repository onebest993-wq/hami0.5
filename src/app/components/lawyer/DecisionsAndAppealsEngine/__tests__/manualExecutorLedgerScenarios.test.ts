import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Decision } from '../types';
import {
    appealWindowsForDecision,
    buildAppealPerpetualEnforcementPatch,
    buildGrievanceDeadlineLapsePatch,
    buildManualExecutorAppealFilePatch,
    buildManualExecutorGrievanceOutcomePatch,
    buildManualExecutorCassationFilePatch,
    CASSATION_APPEAL_WINDOW_DAYS,
    GRIEVANCE_APPEAL_WINDOW_DAYS,
    resolveAppealDeadlineExpiryKind,
    resolveCassationAppealClockYmd,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
    shouldShowAppealDeadlineLapseActions,
} from '../utils';

const DECISION_DATE = '2026-06-01';

function manualLedger(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'ledger-1',
        title: 'قرار منفذ يدوي',
        body: 'تفاصيل',
        date: DECISION_DATE,
        appealStatus: 'pending',
        manualExecutorLedgerEntry: true,
        executorDecisionStatusFlag: 1,
        ...overrides,
    };
}

function atYmd(ymd: string) {
    vi.setSystemTime(new Date(`${ymd}T12:00:00`));
}

describe('إضافة قرار — سيناريو سطر بسطر (قرار بتاريخ 2026-06-01)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يوم الإصدار: علم 1 — لا تظلم ولا تمييز ولا إنهاء مدة', () => {
        atYmd('2026-06-01');
        const row = manualLedger();
        const w = appealWindowsForDecision(row);
        expect(resolveExecutorDecisionStatusFlag(row)).toBe(1);
        expect(w.canTadhallum).toBe(false);
        expect(w.canTamyeez).toBe(false);
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });

    it.each([
        ['2026-06-02', 0],
        ['2026-06-03', 1],
        ['2026-06-04', 2],
    ])('اليوم %s: مهلة التظلم مفتوحة (يوم %i)', (ymd, elapsed) => {
        atYmd(ymd);
        const row = manualLedger();
        const w = appealWindowsForDecision(row);
        expect(w.grievanceDaysElapsed).toBe(elapsed);
        expect(w.canTadhallum).toBe(true);
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });

    it('اليوم 2026-06-05: آخر يوم تظلم مباشر — لا إنهاء مدة (بدون تظلم معلّق)', () => {
        atYmd('2026-06-05');
        const row = manualLedger();
        expect(appealWindowsForDecision(row).grievanceDaysElapsed).toBe(
            GRIEVANCE_APPEAL_WINDOW_DAYS
        );
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });

    it('بعد التظلم: التمييز المباشر من القرار — يوم 2026-06-09 إنهاء مدة التمييز', () => {
        atYmd('2026-06-09');
        const row = manualLedger();
        expect(appealWindowsForDecision(row).cassationDaysElapsed).toBe(
            CASSATION_APPEAL_WINDOW_DAYS
        );
        expect(resolveAppealDeadlineExpiryKind(row)).toBe('cassation');
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(true);
    });

    it('اليوم التالي لانتهاء التمييز: لا تظهر لوحة إنهاء المدة', () => {
        atYmd('2026-06-10');
        const row = manualLedger();
        expect(shouldShowAppealDeadlineLapseActions(row)).toBe(false);
    });
});

describe('مسار التظلم → نتيجة → تمييز', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        atYmd('2026-06-03');
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('تسجيل تظلم: علم 2 + grievance_pending — لا يُضبط ساعة التمييز بعد', () => {
        const filed = buildManualExecutorAppealFilePatch(manualLedger(), 'lawyer', 'tadhallum');
        expect(filed.executorDecisionStatusFlag).toBe(2);
        expect(filed.manualExecutorWorkflowPhase).toBe('grievance_pending');
        expect(filed.grievanceIssuedYmd).toBe('2026-06-03');
        expect(filed.cassationAppealClockYmd).toBeUndefined();

        const pending = { ...manualLedger(), ...filed } as Decision;
        expect(appealWindowsForDecision(pending).canTamyeez).toBe(false);
        expect(shouldShowAppealDeadlineLapseActions(pending)).toBe(false);
    });

    it('أثناء انتظار النتيجة: لا تُحسب مهلة التمييز من القرار الأصلي', () => {
        atYmd('2026-06-09');
        const pending = manualLedger({
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
            manualExecutorAppealAppellant: 'lawyer',
            grievanceIssuedYmd: '2026-06-03',
        });
        expect(resolveManualExecutorWorkflowPhase(pending)).toBe('grievance_pending');
        expect(resolveAppealDeadlineExpiryKind(pending)).not.toBe('cassation');
        expect(shouldShowAppealDeadlineLapseActions(pending)).toBe(false);
    });

    it('يوم انتهاء مهلة التظلم مع تظلم معلّق: إنهاء مدة التظلم فقط', () => {
        atYmd('2026-06-05');
        const pending = {
            ...manualLedger(),
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
        } as Decision;
        expect(resolveAppealDeadlineExpiryKind(pending)).toBe('grievance');
        expect(shouldShowAppealDeadlineLapseActions(pending)).toBe(true);
    });

    it('نتيجة التظلم بتاريخ محدد: تُعاد ساعة التمييز من تاريخ إصدار قرار التظلم', () => {
        const pending = {
            ...manualLedger(),
            ...buildManualExecutorAppealFilePatch(manualLedger(), 'lawyer', 'tadhallum'),
        } as Decision;
        const outcomeYmd = '2026-06-04';
        const afterOutcome = {
            ...pending,
            ...buildManualExecutorGrievanceOutcomePatch(pending, false, outcomeYmd),
        } as Decision;

        expect(afterOutcome.grievanceOutcomeIssuedYmd).toBe(outcomeYmd);
        expect(resolveCassationAppealClockYmd(afterOutcome)).toBe(outcomeYmd);
        expect(resolveManualExecutorWorkflowPhase(afterOutcome)).toBe('cassation_unlocked');

        atYmd('2026-06-12');
        const w = appealWindowsForDecision(afterOutcome);
        expect(w.cassationDaysElapsed).toBe(CASSATION_APPEAL_WINDOW_DAYS);
        expect(shouldShowAppealDeadlineLapseActions(afterOutcome)).toBe(true);
    });

    it('بعد النتيجة: تسجيل تمييز → cassation_pending', () => {
        const unlocked = {
            ...manualLedger(),
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'cassation_unlocked',
            manualExecutorAppealKind: 'tadhallum',
            manualExecutorAppealAppellant: 'lawyer',
            manualExecutorGrievanceOutcome: 'rejected',
            grievanceOutcomeIssuedYmd: '2026-06-04',
            cassationAppealClockYmd: '2026-06-04',
        } as Decision;
        const filed = buildManualExecutorCassationFilePatch(unlocked);
        expect(filed.manualExecutorWorkflowPhase).toBe('cassation_pending');
        expect(filed.manualExecutorAppealKind).toBe('tamyeez');
    });
});

describe('إنهاء المدة يدوياً', () => {
    it('تمييز: أرشفة + نفاذ نهائي', () => {
        const row = manualLedger({
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'cassation_pending',
        });
        const patch = buildAppealPerpetualEnforcementPatch(row);
        expect(patch.appealDeadlinePerpetuallyEnforced).toBe(true);
        expect(patch.isArchived).toBe(true);
        expect(patch.executorDecisionStatusFlag).toBe(1);
    });

    it('تظلم: إغلاق المسار دون أرشفة تلقائية للتمييز', () => {
        const row = manualLedger({
            executorDecisionStatusFlag: 2,
            manualExecutorWorkflowPhase: 'grievance_pending',
            manualExecutorAppealKind: 'tadhallum',
        });
        const patch = buildGrievanceDeadlineLapsePatch(row, []);
        expect(patch.manualExecutorWorkflowPhase).toBe('cassation_unlocked');
        expect(patch.isArchived).toBeFalsy();
    });
});
