import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    isLawyerRequestJudgeOrder,
    isPriorStageLawyerRequestOrderSealed,
    resolveEffectiveRequestOrderDecision,
    resolveInitialLawyerOrderAppealability,
    resolveProceedingsBlockAppealability,
    shouldShowProceedingsBlockToggle,
    shouldShowRequestOrderAppealActions,
} from './requestActionEngine';

function order(overrides: Partial<JudicialDecision> = {}): JudicialDecision {
    return {
        id: 'jd_req1',
        issuedAt: '2026-05-01',
        title: 'طلب محامٍ',
        summary: 'هامش',
        decisionType: 'preparatory',
        appeals: [],
        isLocked: true,
        sourceRequestId: 'req1',
        requestOutcomeStatus: 'approved',
        ...overrides,
    };
}

describe('requestActionEngine', () => {
    it('detects lawyer request judge orders', () => {
        expect(isLawyerRequestJudgeOrder(order())).toBe(true);
        expect(isLawyerRequestJudgeOrder(order({ sourceRequestId: undefined }))).toBe(false);
    });

    it('investigation: always appealable, no toggle, show both appeal channels', () => {
        const d = order();
        expect(shouldShowProceedingsBlockToggle(d, 'investigation')).toBe(false);
        expect(shouldShowRequestOrderAppealActions(d, 'investigation')).toBe(true);
        expect(resolveEffectiveRequestOrderDecision(d, 'investigation').decisionAppealability).toBe(
            'قابل للطعن على انفراد',
        );
        expect(resolveInitialLawyerOrderAppealability('investigation')).toBe('قابل للطعن على انفراد');
    });

    it('misdemeanor: default no appeals; toggle yes enables appeals', () => {
        const d = order();
        expect(shouldShowProceedingsBlockToggle(d, 'misdemeanor')).toBe(true);
        expect(shouldShowRequestOrderAppealActions(d, 'misdemeanor')).toBe(false);
        const yes = order({ decisionAppealability: 'قابل للطعن على انفراد' });
        expect(shouldShowRequestOrderAppealActions(yes, 'misdemeanor')).toBe(true);
    });

    it('felony: toggle only — no intervention in stage gates (handled elsewhere)', () => {
        const d = order({ decisionAppealability: 'قابل للطعن على انفراد' });
        expect(shouldShowProceedingsBlockToggle(d, 'felony')).toBe(true);
        expect(shouldShowRequestOrderAppealActions(d, 'felony')).toBe(true);
    });

    it('maps proceedings block toggle to appealability category', () => {
        expect(resolveProceedingsBlockAppealability(true)).toBe('قابل للطعن على انفراد');
        expect(resolveProceedingsBlockAppealability(false)).toBe('غير قابل للطعن على انفراد');
    });

    it('seals prior-stage records after transition to trial stage', () => {
        const d = order({ decisionAppealability: 'قابل للطعن على انفراد' });
        expect(isPriorStageLawyerRequestOrderSealed(d, 'misdemeanor', 'investigation')).toBe(true);
        expect(shouldShowProceedingsBlockToggle(d, 'misdemeanor', 'investigation')).toBe(false);
        expect(shouldShowRequestOrderAppealActions(d, 'misdemeanor', 'investigation')).toBe(false);
        expect(
            resolveEffectiveRequestOrderDecision(d, 'misdemeanor', 'investigation').decisionAppealability,
        ).toBe('غير قابل للطعن على انفراد');

        const detention = order({
            sourceRequestId: undefined,
            requestOutcomeStatus: undefined,
            title: 'قرار توقيف المتهم',
        });
        expect(shouldShowRequestOrderAppealActions(detention, 'misdemeanor', 'investigation')).toBe(false);
    });

    it('keeps trial-stage lawyer orders governed by toggle in same stage', () => {
        const d = order({ decisionAppealability: 'قابل للطعن على انفراد' });
        expect(isPriorStageLawyerRequestOrderSealed(d, 'misdemeanor', 'misdemeanor')).toBe(false);
        expect(shouldShowProceedingsBlockToggle(d, 'misdemeanor', 'misdemeanor')).toBe(true);
        expect(shouldShowRequestOrderAppealActions(d, 'misdemeanor', 'misdemeanor')).toBe(true);
    });
});
