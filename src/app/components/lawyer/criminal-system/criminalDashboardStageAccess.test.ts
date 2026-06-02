import { describe, expect, it } from 'vitest';
import type { StageConclusion } from './criminalStore';
import {
    isTemporaryClosingFollowUp,
    resolveCanConcludeStage,
    resolveCanCreateDecisionsOrRequests,
    shouldOpenInvestigationDecisionModal,
} from './criminalDashboardStageAccess';

const temporaryClosing: StageConclusion = {
    id: 'c1',
    stageType: 'investigation',
    decisionType: 'temporary_closing',
    date: '2026-05-20',
    details: 'غلق مؤقت',
    defendantStatusAtDecision: 'bailed',
};

const referralDecision: StageConclusion = {
    id: 'c2',
    stageType: 'investigation',
    decisionType: 'referral',
    date: '2026-05-21',
    details: 'إحالة',
    defendantStatusAtDecision: 'detained',
};

describe('criminalDashboardStageAccess', () => {
    it('detects temporary closing follow-up', () => {
        expect(isTemporaryClosingFollowUp(temporaryClosing)).toBe(true);
        expect(isTemporaryClosingFollowUp(referralDecision)).toBe(false);
        expect(isTemporaryClosingFollowUp(undefined)).toBe(false);
    });

    it('allows stage conclusion after temporary closing in investigation', () => {
        expect(
            resolveCanConcludeStage({
                isDefaultJudgmentArchived: false,
                isArchived: false,
                isPrejudicialFrozen: false,
                finalDecision: temporaryClosing,
                isInvestigationPhase: true,
                hasTrialStageType: false,
            }),
        ).toBe(true);
    });

    it('blocks stage conclusion when a terminal final decision exists', () => {
        expect(
            resolveCanConcludeStage({
                isDefaultJudgmentArchived: false,
                isArchived: false,
                isPrejudicialFrozen: false,
                finalDecision: referralDecision,
                isInvestigationPhase: true,
                hasTrialStageType: false,
            }),
        ).toBe(false);
    });

    it('allows new decisions in trial even when investigation lock flag remains', () => {
        expect(
            resolveCanCreateDecisionsOrRequests({
                isDashboardReadOnly: false,
                isCassationFilterReadOnly: false,
                isHistoricalNodeView: false,
                isInterventionReview: false,
                isInvestigationPhase: false,
                isInvestigationDossierSealed: false,
                isInvestigationLocked: true,
                isPrejudicialFrozen: false,
            }),
        ).toBe(true);
    });

    it('blocks new decisions when investigation dossier is sealed', () => {
        expect(
            resolveCanCreateDecisionsOrRequests({
                isDashboardReadOnly: false,
                isCassationFilterReadOnly: false,
                isHistoricalNodeView: false,
                isInterventionReview: false,
                isInvestigationPhase: true,
                isInvestigationDossierSealed: true,
                isInvestigationLocked: false,
                isPrejudicialFrozen: false,
            }),
        ).toBe(false);
    });

    it('routes investigation modal after temporary closing', () => {
        expect(
            shouldOpenInvestigationDecisionModal({
                isInvestigationPhase: true,
                finalDecision: temporaryClosing,
            }),
        ).toBe(true);
        expect(
            shouldOpenInvestigationDecisionModal({
                isInvestigationPhase: true,
                finalDecision: referralDecision,
            }),
        ).toBe(false);
    });
});
