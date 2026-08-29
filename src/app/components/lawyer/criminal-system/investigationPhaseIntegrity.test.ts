import { beforeEach, describe, expect, it } from 'vitest';
import { syncStoredStageFromJourneyCaseStage } from './criminalStageUtils';
import { resolveCanCreateDecisionsOrRequests } from './criminalDashboardStageAccess';
import { isInvestigationDraftLocationIncomplete } from './investigationDraftValidation';
import { applyCassationFiling } from './cassationEngine';
import {
    useCriminalStore,
    type CriminalCaseStage,
} from './criminalStore';
import { resetCriminalStore } from './__tests__/criminalStoreTestHelpers';

function seedDraftForNewCase(stage: CriminalCaseStage) {
    const s = useCriminalStore.getState();
    s.setBasicField('stage', stage);
    s.setLocationField('investigationCourtName', 'محكمة تحقيق الكرخ');
    s.setLocationField('baseRegisterNumberAndDate', '1/2026 في 2026-05-19');
    s.setLocationField('investigationPapersAt', 'مركز شرطة');
    s.setLocationField('policeStationName', 'مركز شرطة الكرخ');
    const d1 = useCriminalStore.getState().draft.defendants[0]?.id;
    if (d1) {
        s.setDefendantField(d1, 'fullName', 'محمد قاسم');
        s.setDefendantField(d1, 'birthYear', '1990');
    }
}

describe('investigation phase integrity', () => {
    beforeEach(() => {
        resetCriminalStore();
    });

    it('validates draft location for adult and juvenile investigation stored stages', () => {
        const incomplete = {
            courtName: '',
            caseNumber: '',
            investigationCourtName: '',
            investigationPapersAt: '' as const,
            investigationOfficeName: '',
            policeStationName: '',
            baseRegisterNumberAndDate: '',
            investigationDossierNumber: '',
            publicProsecutionNumber: '',
            trialJudgeName: '',
            nextHearingDate: '',
        };
        expect(isInvestigationDraftLocationIncomplete('مرحلة التحقيق', incomplete)).toBe(true);
        expect(isInvestigationDraftLocationIncomplete('تحقيق الأحداث', incomplete)).toBe(true);
        expect(isInvestigationDraftLocationIncomplete('محكمة الجنح', incomplete)).toBe(false);
    });

    it('syncStoredStageFromJourneyCaseStage preserves juvenile labels on remand/sync', () => {
        expect(syncStoredStageFromJourneyCaseStage('investigation', 'تحقيق الأحداث')).toBe(
            'تحقيق الأحداث',
        );
        expect(syncStoredStageFromJourneyCaseStage('misdemeanor', 'محكمة الأحداث')).toBe(
            'محكمة الأحداث',
        );
    });

    it('blocks investigation log mutations when dossier is investigation-locked', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.setState((state) => {
            const target = state.casesById[caseId];
            if (!target) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...target,
                        caseStage: 'investigation' as const,
                        isInvestigationLocked: true,
                        investigationLogs: [
                            {
                                id: 'log1',
                                date: '2026-05-19',
                                category: 'official_letter',
                                title: 'مفاتحة',
                                details: 'x',
                                status: 'awaiting_response',
                            },
                        ],
                    },
                },
            };
        });

        useCriminalStore.getState().updateInvestigationLog(caseId, 'log1', { details: 'y' });
        expect(useCriminalStore.getState().casesById[caseId]?.investigationLogs?.[0]?.details).toBe('x');

        useCriminalStore.getState().addInvestigationLog(caseId, {
            id: 'log2',
            date: '2026-05-20',
            category: 'official_letter',
            title: 'ثانية',
            details: 'z',
            status: 'awaiting_response',
        });
        expect(useCriminalStore.getState().casesById[caseId]?.investigationLogs?.length).toBe(1);
    });

    it('reopenClosedCase clears investigation lock', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().issueStageDecision(caseId, {
            id: 'close1',
            stageType: 'investigation',
            decisionType: 'closed_final',
            date: '2026-05-20',
            details: 'غلق',
            defendantStatusAtDecision: 'bailed',
            closureReason: 'insufficient_evidence',
        });
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                [caseId]: {
                    ...state.casesById[caseId]!,
                    isInvestigationLocked: true,
                },
            },
        }));

        useCriminalStore.getState().reopenClosedCase(caseId, 'دليل جديد');
        const reopened = useCriminalStore.getState().casesById[caseId];
        expect(reopened.isInvestigationLocked).not.toBe(true);
        expect(reopened.finalDecision).toBeUndefined();
        expect(reopened.isFrozen).not.toBe(true);
    });

    it('cassation investigation judge appeal preserves juvenile investigation stage label', () => {
        seedDraftForNewCase('تحقيق الأحداث');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const base = useCriminalStore.getState().casesById[caseId]!;
        const filed = applyCassationFiling(
            { ...base, caseStage: 'investigation' },
            {
                cassationType: 'investigation_judge_appeal',
                filedAt: '2026-05-21',
                details: 'طعن',
                cassationNumber: 'INV/J',
                panelName: 'تمييز',
                appellantDefendantIds: [base.defendants[0]?.id ?? ''],
            },
        );
        expect(filed.basics.stage).toBe('تحقيق الأحداث');
        expect(filed.caseStage).toBe('investigation');
    });

    it('resolveCanCreateDecisionsOrRequests respects investigation seal and lock', () => {
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
        expect(
            resolveCanCreateDecisionsOrRequests({
                isDashboardReadOnly: false,
                isCassationFilterReadOnly: false,
                isHistoricalNodeView: false,
                isInterventionReview: false,
                isInvestigationPhase: true,
                isInvestigationDossierSealed: false,
                isInvestigationLocked: true,
                isPrejudicialFrozen: false,
            }),
        ).toBe(false);
        expect(
            resolveCanCreateDecisionsOrRequests({
                isDashboardReadOnly: false,
                isCassationFilterReadOnly: false,
                isHistoricalNodeView: false,
                isInterventionReview: false,
                isInvestigationPhase: true,
                isInvestigationDossierSealed: false,
                isInvestigationLocked: false,
                isPrejudicialFrozen: false,
            }),
        ).toBe(true);
    });
});
