import { describe, expect, it } from 'vitest';
import {
    buildAppealProceedingsForDecision,
    resolveCassationAppellantLabel,
} from '../utils';
import type { Decision } from '../types';

function baseDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'd1',
        title: 'طلب إحضار',
        body: '',
        date: '2026-01-01',
        appealStatus: 'pending',
        ...overrides,
    };
}

describe('buildAppealProceedingsForDecision', () => {
    it('parses grievance then cassation from timeline logs', () => {
        const row = baseDecision({
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.',
                    tone: 'emerald',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'سُجِّل تمييز المدين على قرار المنفذ.',
                    tone: 'amber',
                },
                {
                    id: '4',
                    at: '2026-01-05T10:00:00.000Z',
                    message: 'رد اللائحة يعني تثبيت طلبنا',
                    tone: 'rose',
                },
            ],
            appealMethod: 'tamyeez',
            appealResult: 'تصديق القرار',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({ stage: 'تظلم', appellant: 'الدائن', result: 'قبول التظلم' });
        expect(steps[1]).toMatchObject({ stage: 'تمييز', appellant: 'المدين', result: 'تصديق القرار' });
    });

    it('falls back to structured fields when logs are missing', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_rejection',
            executorOutcome: 'rejected',
            appealActor: 'lawyer',
            appealMethod: 'tadhallum',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
            appealResult: 'قبول التظلم',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps[0]).toMatchObject({
            stage: 'تظلم',
            appellant: 'الدائن',
            result: 'قبول التظلم',
        });
    });

    it('shows creditor as cassation appellant after debtor grievance accepted (not grievance filer)', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'rejected',
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'final',
            appealResult: 'نقض القرار',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم المدين على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.',
                    tone: 'emerald',
                },
            ],
        });

        expect(resolveCassationAppellantLabel(row)).toBe('الدائن');
        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({ stage: 'تظلم', appellant: 'المدين', result: 'قبول التظلم' });
        expect(steps[1]).toMatchObject({ stage: 'تمييز', appellant: 'الدائن', result: 'نقض القرار' });
    });

    it('reconciles stale grievance log when appealResult is newer acceptance', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealActor: 'lawyer',
            appealMethod: 'tamyeez',
            appealStatus: 'tamyeez_filed',
            appealPhase: 'cassation',
            appealResult: 'قبول التظلم',
            awaitingCassationEntryBy: 'debtor',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: رُد التظلم.',
                    tone: 'rose',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'تم تسجيل تظلم موكّل المدين على القرار.',
                    tone: 'amber',
                },
            ],
        });

        const creditorSteps = buildAppealProceedingsForDecision(row);
        expect(creditorSteps.some((s) => s.stage === 'تظلم' && s.result === 'قبول التظلم')).toBe(
            true
        );
        const debtorSteps = buildAppealProceedingsForDecision(row, 'debtor_agent');
        const accepted = debtorSteps.filter((s) => s.stage === 'تظلم' && s.result === 'قبول التظلم');
        expect(accepted.length).toBeGreaterThan(0);
        expect(accepted[accepted.length - 1].appellant).toBe('موكّلنا');
    });

    it('drops superseded appeal cycles and shows current grievance only', () => {
        const row = baseDecision({
            appealRequestOrigin: 'creditor_side',
            appealBaseBranch: 'after_approval',
            executorOutcome: 'approved',
            appealActor: 'debtor',
            appealMethod: 'tamyeez',
            appealStatus: 'pending',
            appealPhase: 'grievance',
            appealResult: 'قبول التظلم',
            awaitingCassationEntryBy: 'lawyer',
            appealTimelineLogs: [
                {
                    id: '1',
                    at: '2026-01-02T10:00:00.000Z',
                    message: 'تم تسجيل تظلم وكيل الدائن على القرار.',
                    tone: 'amber',
                },
                {
                    id: '2',
                    at: '2026-01-03T10:00:00.000Z',
                    message: 'النتيجة: رُد التظلم.',
                    tone: 'rose',
                },
                {
                    id: '3',
                    at: '2026-01-04T10:00:00.000Z',
                    message: 'تم تسجيل تظلم موكّل المدين على القرار.',
                    tone: 'amber',
                },
                {
                    id: '4',
                    at: '2026-01-05T10:00:00.000Z',
                    message: 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز.',
                    tone: 'emerald',
                },
            ],
        });

        const steps = buildAppealProceedingsForDecision(row, 'debtor_agent');
        expect(steps).toHaveLength(2);
        expect(steps[0]).toMatchObject({
            stage: 'تظلم',
            appellant: 'موكّلنا',
            result: 'قبول التظلم',
        });
        expect(steps[1]).toMatchObject({
            stage: 'تمييز',
            appellant: 'الدائن',
            result: 'بانتظار التسجيل',
        });
        expect(steps.some((s) => s.result === 'رد التظلم')).toBe(false);
    });

    it('does not add unused cassation row for grievance-only state', () => {
        const row = baseDecision({
            appealActor: 'debtor',
            appealMethod: 'tadhallum',
            appealPhase: 'grievance',
            appealStatus: 'tadhallum_filed',
            appealResult: 'قبول التظلم',
        });

        const steps = buildAppealProceedingsForDecision(row);
        expect(steps).toHaveLength(1);
        expect(steps.some((s) => s.stage === 'تمييز')).toBe(false);
    });
});
