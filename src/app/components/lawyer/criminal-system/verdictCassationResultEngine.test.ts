import { describe, expect, it } from 'vitest';
import {
    applyVerdictCassationResultEffects,
    coerceLegacyVerdictCassationResult,
    isVerdictCassationCorrectionBlockedResult,
    isVerdictCassationCorrectionEligibleResult,
    validateVerdictCassationResultSave,
    verdictCassationResultNeedsBindingDirections,
    verdictCassationResultNeedsReferralCourt,
} from './verdictCassationResultEngine';
import type { CriminalCase } from './criminalStore';
import { getCurrentJourneyNode } from './stageJourney';

describe('verdictCassationResultEngine', () => {
    it('coerces legacy affirmation and remand values', () => {
        expect(coerceLegacyVerdictCassationResult('procedural_affirmation')).toBe(
            'verdict_substantive_affirmation',
        );
        expect(coerceLegacyVerdictCassationResult('quash_remand')).toBe('verdict_quash_remand_retrial');
    });

    it('shows conditional fields per result', () => {
        expect(verdictCassationResultNeedsReferralCourt('verdict_quash_referral_jurisdiction')).toBe(true);
        expect(verdictCassationResultNeedsBindingDirections('verdict_quash_remand_retrial')).toBe(true);
        expect(verdictCassationResultNeedsReferralCourt('verdict_substantive_affirmation')).toBe(false);
    });

    it('validates referral court and binding directions', () => {
        expect(
            validateVerdictCassationResultSave({
                result: 'verdict_quash_referral_jurisdiction',
                resultRecordedAt: '2026-05-10',
            }),
        ).toContain('المحكمة');
        expect(
            validateVerdictCassationResultSave({
                result: 'verdict_quash_remand_retrial',
                resultRecordedAt: '2026-05-10',
            }),
        ).toContain('توجيهات');
    });

    it('maps correction visibility — m266 eligible vs m267 blocked', () => {
        expect(isVerdictCassationCorrectionEligibleResult('verdict_substantive_affirmation')).toBe(true);
        expect(isVerdictCassationCorrectionEligibleResult('verdict_quash_modify_mitigate')).toBe(true);
        expect(isVerdictCassationCorrectionEligibleResult('verdict_quash_modify_aggravate')).toBe(true);

        expect(isVerdictCassationCorrectionBlockedResult('verdict_formal_dismissal')).toBe(true);
        expect(isVerdictCassationCorrectionBlockedResult('verdict_quash_remand_retrial')).toBe(true);
        expect(isVerdictCassationCorrectionBlockedResult('verdict_quash_referral_jurisdiction')).toBe(true);
    });

    it('same-court remand reopens misdemeanor from journey even when caseStage is stale investigation', () => {
        const caseRecord = {
            caseStage: 'investigation',
            isSentToCassation: true,
            basics: { stage: 'مرحلة التحقيق', crimeType: 'جنحة' },
            defendants: [{ id: 'd1', fullName: 'متهم' }],
            stageJourney: [
                { id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'past' },
                { id: '2', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'past', endedAt: '2026-05-01' },
                { id: '3', stage: 'cassation', label: 'تمييز', status: 'current' },
            ],
            cassationProceeding: {
                stageBeforeCassation: 'misdemeanor',
                cassationType: 'misdemeanor_cassation',
                status: 'pending',
            },
            timelineEvents: [],
        } as unknown as CriminalCase;

        const outcome = applyVerdictCassationResultEffects(
            caseRecord,
            { id: 'vc1', defendantIds: ['d1'] } as any,
            {
                result: 'verdict_quash_remand_retrial',
                resultRecordedAt: '2026-06-15',
                bindingDirections: 'إعادة المحاكمة',
            },
        );

        expect(outcome.error).toBeUndefined();
        expect(getCurrentJourneyNode(outcome.caseRecord.stageJourney)?.stage).toBe('misdemeanor');
        expect(outcome.caseRecord.caseStage).toBe('misdemeanor');
    });
});
