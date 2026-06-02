import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    isPriorStageRecordAppealsSealed,
    isPriorStageRelativeToCurrent,
    isProceduralStageTransitionDecision,
} from './stageTransitionAppealEngine';

function decision(overrides: Partial<JudicialDecision> = {}): JudicialDecision {
    return {
        id: 'jd1',
        issuedAt: '2026-05-01',
        title: 'قرار',
        summary: 'ملخص',
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
        ...overrides,
    };
}

describe('stageTransitionAppealEngine', () => {
    it('detects procedural route transition decisions', () => {
        expect(
            isProceduralStageTransitionDecision(
                decision({ sourceRequestId: 'route_ref1', title: 'عدم اختصاص' }),
            ),
        ).toBe(true);
        expect(
            isProceduralStageTransitionDecision(
                decision({ title: 'قرار إحالة إلى محكمة الموضوع', summary: 'إحالة' }),
            ),
        ).toBe(true);
        expect(
            isProceduralStageTransitionDecision(
                decision({ title: 'إحالة إلى مكتب البحث الاجتماعي', proceduralTemplate: 'إحالة إلى مكتب البحث الاجتماعي' }),
            ),
        ).toBe(false);
    });

    it('isPriorStageRelativeToCurrent compares investigation/misdemeanor/felony', () => {
        expect(isPriorStageRelativeToCurrent('investigation', 'misdemeanor')).toBe(true);
        expect(isPriorStageRelativeToCurrent('misdemeanor', 'felony')).toBe(true);
        expect(isPriorStageRelativeToCurrent('misdemeanor', 'misdemeanor')).toBe(false);
        expect(isPriorStageRelativeToCurrent('felony', 'misdemeanor')).toBe(false);
    });

    it('seals all prior-stage records except transition referral', () => {
        const lawyerOrder = decision({
            sourceRequestId: 'req1',
            requestOutcomeStatus: 'approved',
            title: 'طلب محامٍ',
        });
        expect(isPriorStageRecordAppealsSealed(lawyerOrder, 'misdemeanor', 'investigation')).toBe(true);

        const detention = decision({ title: 'قرار توقيف المتهم' });
        expect(isPriorStageRecordAppealsSealed(detention, 'misdemeanor', 'investigation')).toBe(true);

        const routeReferral = decision({
            sourceRequestId: 'route_ref1',
            title: 'عدم اختصاص نوعي — إحالة للجنايات',
            isAppealable: true,
        });
        expect(isPriorStageRecordAppealsSealed(routeReferral, 'felony', 'misdemeanor')).toBe(false);

        const sameStage = decision({ title: 'قرار' });
        expect(isPriorStageRecordAppealsSealed(sameStage, 'misdemeanor', 'misdemeanor')).toBe(false);
    });
});
