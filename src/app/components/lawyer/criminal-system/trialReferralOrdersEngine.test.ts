import { describe, expect, it } from 'vitest';
import {
    getTrialCourtReferralOrderOptions,
    isProceduralStageRouteActionId,
    isTrialReferralOrderActionId,
    proceduralRouteTimelineCategory,
    referralOrderMenuLabel,
    shouldRecordAppealableRouteLawyerRequest,
} from './trialReferralOrdersEngine';

describe('trialReferralOrdersEngine', () => {
    it('referralOrderMenuLabel uses short labels without emoji', () => {
        expect(referralOrderMenuLabel('return_investigation_deficiency')).toBe('إعادة للتحقيق');
        expect(referralOrderMenuLabel('misdemeanor_to_felony_jurisdiction')).toBe('إحالة للجنايات');
        expect(referralOrderMenuLabel('felony_to_misdemeanor_jurisdiction')).toBe('إحالة للجنح');
    });

    it('offers two referral options per trial court stage', () => {
        const misd = getTrialCourtReferralOrderOptions('misdemeanor');
        expect(misd.map((o) => o.actionId)).toEqual([
            'return_investigation_deficiency',
            'misdemeanor_to_felony_jurisdiction',
        ]);

        const fel = getTrialCourtReferralOrderOptions('felony');
        expect(fel.map((o) => o.actionId)).toEqual([
            'return_investigation_deficiency',
            'felony_to_misdemeanor_jurisdiction',
        ]);
    });

    it('covers all stage route actions for unified transition engine', () => {
        expect(isProceduralStageRouteActionId('trial_cassation_appeal')).toBe(true);
        expect(isProceduralStageRouteActionId('cassation_confirm')).toBe(true);
        expect(proceduralRouteTimelineCategory('trial_cassation_appeal')).toContain('تمييز');
    });

    it('records appealable lawyer ledger only for trial court referral orders', () => {
        expect(isTrialReferralOrderActionId('misdemeanor_to_felony_jurisdiction')).toBe(true);
        expect(shouldRecordAppealableRouteLawyerRequest('misdemeanor_to_felony_jurisdiction')).toBe(true);
        expect(shouldRecordAppealableRouteLawyerRequest('trial_cassation_appeal')).toBe(false);
    });
});
