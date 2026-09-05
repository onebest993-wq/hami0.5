import { describe, expect, it } from 'vitest';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    APPEAL_WINDOW_LAPSE_METHOD,
    CASSATION_WINDOW_LAPSE_METHOD,
    applyAppealWindowLapse,
    applyCassationWindowLapse,
    filterOpponentMethodsAfterLapse,
    shouldOfferAppealWindowLapse,
    shouldOfferCassationWindowLapse,
    stripDeadlineTeachingLines,
} from '../appealWindowLapseEngine';
import { computeFirstInstanceAppealDeadline } from '../appealDeadlineEngine';

function stage(overrides: Partial<CaseStage> = {}): CaseStage {
    return {
        id: 's1',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'active',
        decisionDate: '2026-08-01',
        appealDeadline: computeFirstInstanceAppealDeadline('2026-08-01'),
        legalTimers: {
            appealDeadline: computeFirstInstanceAppealDeadline('2026-08-01'),
            cassationDeadline: '2026-08-31',
        },
        awaitingOpponentAppeal: true,
        ...overrides,
    } as CaseStage;
}

describe('appealWindowLapseEngine', () => {
    it('offers appeal lapse only after the first-instance window ends', () => {
        const s = stage();
        expect(shouldOfferAppealWindowLapse(s, new Date('2026-08-16T12:00:00'))).toBe(false);
        expect(shouldOfferAppealWindowLapse(s, new Date('2026-08-18T12:00:00'))).toBe(true);
        expect(shouldOfferAppealWindowLapse({ ...s, appealWindowLapsed: true }, new Date('2026-08-18'))).toBe(false);
    });

    it('offers cassation lapse after appeal lapse, or on appeal stage', () => {
        const first = stage({ appealWindowLapsed: true });
        expect(shouldOfferCassationWindowLapse(first, new Date('2026-08-30'))).toBe(false);
        expect(shouldOfferCassationWindowLapse(first, new Date('2026-09-01'))).toBe(true);

        const appeal = stage({
            stageName: 'الاستئناف',
            name: 'الاستئناف',
            appealWindowLapsed: false,
            legalTimers: { cassationDeadline: '2026-08-31' },
        });
        expect(shouldOfferCassationWindowLapse(appeal, new Date('2026-09-01'))).toBe(true);
    });

    it('locks استئناف after appeal lapse and records timeline without remaining-days teaching', () => {
        expect(filterOpponentMethodsAfterLapse(['استئناف', 'تمييز'], { appealWindowLapsed: true })).toEqual([
            'تمييز',
        ]);
        const patch = applyAppealWindowLapse(stage(), '2026-08-18');
        expect(patch.appealWindowLapsed).toBe(true);
        expect(patch.awaitingOpponentAppeal).toBe(true);
        expect(patch.timeline?.[0]?.title).toBe(APPEAL_WINDOW_LAPSE_METHOD);
        expect(String(patch.timeline?.[0]?.details)).not.toMatch(/15|متبقي|يوم/);
    });

    it('cassation lapse closes the watch and records a factual timeline event', () => {
        const patch = applyCassationWindowLapse(stage({ appealWindowLapsed: true }), '2026-09-01');
        expect(patch.cassationWindowLapsed).toBe(true);
        expect(patch.awaitingOpponentAppeal).toBe(false);
        expect(patch.status).toBe('completed');
        expect(patch.timeline?.[0]?.title).toBe(CASSATION_WINDOW_LAPSE_METHOD);
        expect(String(patch.timeline?.[0]?.details)).not.toMatch(/شهر|متبقي|30/);
    });

    it('strips remaining-period teaching from stored timeline bodies', () => {
        const body = [
            'المنطوق: إجابة الدعوى بالكامل',
            'صدر الحكم وقُفلت المرافعة بانتظار انتهاء المدة القانونية للطعن.',
            'مواعيد الطعن القانونية:',
            '- الاستئناف: حتى 2026-09-16 (15 يوماً من اليوم التالي لصدور القرار)',
            '- التمييز: حتى 2026-09-30 (شهر من تاريخ صدور القرار)',
        ].join('\n');
        const cleaned = stripDeadlineTeachingLines(body);
        expect(cleaned).toContain('المنطوق');
        expect(cleaned).not.toContain('15 يوماً');
        expect(cleaned).not.toContain('مواعيد الطعن');
        expect(cleaned).not.toContain('2026-09-16');
    });
});
