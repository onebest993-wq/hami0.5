import { describe, expect, it } from 'vitest';
import { STAGE_EXPIRATION_REASONS } from './stageExpirationReasons';
import {
    resolveCanConcludeStage,
    resolveCanCreateDecisionsOrRequests,
    shouldOpenInvestigationDecisionModal,
} from './criminalDashboardStageAccess';
import { isInvestigationStoredStage } from './criminalStageUtils';
import { investigationDossierIsSealed } from './investigationDefendantPurge';
import type { CriminalCase } from './criminalStore';

function investigationCase(overrides: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'c1',
        createdAt: '2026-01-01',
        basics: {
            role: 'وكيل المشتكي',
            ourRepresentation: 'complainant_side',
            stage: 'مرحلة التحقيق',
            legalArticle: '413',
            crimeType: 'جنحة',
        },
        location: {
            investigationCourtName: 'محكمة تحقيق الكرخ',
            investigationPapersAt: 'مركز شرطة',
            policeStationName: 'الجمهوري',
            baseRegisterNumberAndDate: '1/2026',
            investigationOfficeName: '',
            investigationDossierNumber: '',
            courtName: '',
            caseNumber: '',
            publicProsecutionNumber: '',
            trialJudgeName: '',
            nextHearingDate: '',
        },
        complainants: [],
        unknownDefendant: false,
        defendants: [
            {
                id: 'd1',
                fullName: 'متهم',
                status: 'موقوف',
                address: '',
                investigationStatus: 'closed_pending',
            },
        ],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'investigator_room',
        isMutualComplaint: false,
        legalArticleHistory: [],
        caseStage: 'investigation',
        isFrozen: true,
        investigationDossierClosure: { kind: 'temporary', closedAt: '2026-05-01' },
        ...overrides,
    } as CriminalCase;
}

describe('CriminalDashboard investigation integration', () => {
    it('includes statute of limitations expiration reason', () => {
        expect(STAGE_EXPIRATION_REASONS.some((r) => r.value === 'statute_of_limitations')).toBe(true);
    });

    it('isInvestigationStoredStage covers adult and juvenile investigation labels', () => {
        expect(isInvestigationStoredStage('مرحلة التحقيق')).toBe(true);
        expect(isInvestigationStoredStage('تحقيق الأحداث')).toBe(true);
        expect(isInvestigationStoredStage('محكمة الجنح')).toBe(false);
    });

    it('shouldOpenInvestigationDecisionModal when no final decision or temporary closing', () => {
        expect(
            shouldOpenInvestigationDecisionModal({
                isInvestigationPhase: true,
                finalDecision: undefined,
            }),
        ).toBe(true);
        expect(
            shouldOpenInvestigationDecisionModal({
                isInvestigationPhase: true,
                finalDecision: {
                    id: '1',
                    stageType: 'investigation',
                    decisionType: 'referral',
                    date: '2026-05-01',
                    details: 'إحالة',
                    defendantStatusAtDecision: 'bailed',
                },
            }),
        ).toBe(false);
    });

    it('resolveCanConcludeStage allows temporary closing follow-up in investigation', () => {
        expect(
            resolveCanConcludeStage({
                isDefaultJudgmentArchived: false,
                isArchived: false,
                isPrejudicialFrozen: false,
                finalDecision: {
                    id: 't1',
                    stageType: 'investigation',
                    decisionType: 'temporary_closing',
                    date: '2026-05-01',
                    details: 'غلق مؤقت',
                    defendantStatusAtDecision: 'bailed',
                },
                isInvestigationPhase: true,
                hasTrialStageType: false,
            }),
        ).toBe(true);
    });

    it('investigationDossierIsSealed when frozen, closure recorded, no active defendants', () => {
        const sealed = investigationCase();
        expect(investigationDossierIsSealed(sealed)).toBe(true);
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
});
