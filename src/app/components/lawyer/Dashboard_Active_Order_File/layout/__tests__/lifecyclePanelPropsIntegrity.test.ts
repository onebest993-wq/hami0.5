import { describe, expect, it } from 'vitest';
import { buildLifecyclePanelProps } from '../buildLifecyclePanelProps';
import {
    pickCassationLifecyclePanelProps,
    pickGrievanceLifecyclePanelProps,
    pickJudgeDecisionLifecyclePanelProps,
} from '../../panels/pickLifecyclePanelProps';

/** يتحقق أن مفاتيح pick لا تتجاوز ما يُنتجه buildLifecyclePanelProps */
describe('lifecycle panel props integrity', () => {
    const minimalBuilt = buildLifecyclePanelProps({
        pathway: {
            cassationStepNumber: 3,
            grievanceStepNumber: 2,
            computedCassationFiledBy: null,
            computedGrievanceFiledBy: 'client',
            isIqrarContext: false,
            isStateOrder: true,
            partyLabel: (r: 'client' | 'opponent' | null) => (r === 'client' ? 'الموكل' : 'الخصم'),
            showGrievanceStep: true,
            showPreDecisionHearings: false,
        } as unknown as ReturnType<typeof import('../../hooks/useOrderFileCasePathway').useOrderFileCasePathway>,
        derived: {} as unknown as ReturnType<typeof import('../../hooks/useOrderFileLifecycleDerived').useOrderFileLifecycleDerived>,
        actions: {} as unknown as ReturnType<typeof import('../../hooks/useOrderFileLifecycleActions').useOrderFileLifecycleActions>,
        activeLifecycleStep: null,
        caseData: {},
        cassationData: { filedBy: null, outcome: '', filingDate: '', fileNumber: '' },
        cassationDecision: { decision: null, decisionDate: '' },
        cassationDecisionError: null,
        cassationDecisionGateRef: { current: null },
        cassationError: null,
        cassationExpiredConfirmed: false,
        cassationFilingGateRef: { current: null },
        cassationRef: { current: null },
        defenderPhase1ReadOnly: false,
        defenderPhase2ReadOnly: false,
        editCassation: false,
        editGrievance: false,
        editJudge: false,
        fileStatus: 'pending',
        grievanceData: { rejectionNotificationDate: '', outcome: '', filingDate: '' },
        grievanceDecision: { decision: null, decisionDate: '' },
        grievanceDecisionError: null,
        grievanceDecisionNotificationConfirmed: false,
        grievanceError: null,
        grievanceExpiredConfirmed: false,
        grievanceFinalGateRef: { current: null },
        grievanceHearingsGateRef: { current: null },
        grievanceLegalEndDate: '',
        grievanceOutcomeGateRef: { current: null },
        grievanceRef: { current: null },
        grievanceTimingConfirmed: false,
        guaranteeDetails: { amount: '', receiptNumber: '' },
        guaranteeGateActive: false,
        guaranteeSubmitted: false,
        hasIntervention: false,
        hearingDraft: {
            open: false,
            stage: 'grievance',
            outcome: 'adjourn' as const,
            sessionDate: '',
            notes: '',
            nextSessionDate: '',
            decisionDate: '',
        },
        hearingsError: null,
        isDefendantClient: false,
        isFinalityNoGrievance: false,
        isFinalityTerminatedRequest: false,
        isFinalized: false,
        judgeDecision: { decision: null, decisionDate: '', requiresGuarantee: false },
        judgeError: null,
        phase2FirstHearingDate: '',
        setActiveLifecycleStep: () => {},
        setCassationData: () => {},
        setCassationDecision: () => {},
        setCassationExpiredConfirmed: () => {},
        setDecisionNotificationModalOpen: () => {},
        setEditCassation: () => {},
        setEditGrievance: () => {},
        setGrievanceData: () => {},
        setGrievanceDecision: () => {},
        setGrievanceDetailsConfirmed: () => {},
        setGrievanceExpiredConfirmed: () => {},
        setGrievanceLegalEndDate: () => {},
        setGuaranteeDetails: () => {},
        setGuaranteeSubmitted: () => {},
        setHearingDraft: () => {},
        setJudgeDecision: () => {},
        setPhase2FirstHearingDate: () => {},
    });

    const builtKeys = new Set(Object.keys(minimalBuilt));

    it('judge pick keys are subset of built props', () => {
        const judge = pickJudgeDecisionLifecyclePanelProps(minimalBuilt);
        for (const key of Object.keys(judge)) {
            expect(builtKeys.has(key)).toBe(true);
        }
    });

    it('grievance pick keys are subset of built props', () => {
        const g = pickGrievanceLifecyclePanelProps(minimalBuilt);
        for (const key of Object.keys(g)) {
            expect(builtKeys.has(key)).toBe(true);
        }
    });

    it('cassation pick keys are subset of built props', () => {
        const c = pickCassationLifecyclePanelProps(minimalBuilt);
        for (const key of Object.keys(c)) {
            expect(builtKeys.has(key)).toBe(true);
        }
    });
});
