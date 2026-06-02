import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { HearingDraftState } from '../hooks/useOrderFileLifecycleState';
import type {
    CassationData,
    CassationDecision,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
} from '../types';

/** حقول state/setters التي يمرّرها ActiveOrderFileRoot إلى buildLifecyclePanelProps */
export type LifecyclePanelStateInput = {
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    caseData: Record<string, unknown> | null;
    cassationData: CassationData;
    cassationDecision: CassationDecision;
    cassationDecisionError: string | null;
    cassationDecisionGateRef: RefObject<HTMLDivElement | null>;
    cassationError: string | null;
    cassationExpiredConfirmed: boolean;
    cassationFilingGateRef: RefObject<HTMLDivElement | null>;
    cassationRef: RefObject<HTMLDivElement | null>;
    defenderPhase1ReadOnly: boolean;
    defenderPhase2ReadOnly: boolean;
    editCassation: boolean;
    editGrievance: boolean;
    editJudge: boolean;
    fileStatus: FileStatus;
    grievanceData: GrievanceData;
    grievanceDecision: GrievanceDecision;
    grievanceDecisionError: string | null;
    grievanceDecisionNotificationConfirmed: boolean;
    grievanceError: string | null;
    grievanceExpiredConfirmed: boolean;
    grievanceFinalGateRef: RefObject<HTMLDivElement | null>;
    grievanceHearingsGateRef: RefObject<HTMLDivElement | null>;
    grievanceLegalEndDate: string;
    grievanceOutcomeGateRef: RefObject<HTMLDivElement | null>;
    grievanceRef: RefObject<HTMLDivElement | null>;
    grievanceTimingConfirmed: boolean;
    guaranteeDetails: { amount: string; receiptNumber: string };
    guaranteeGateActive: boolean;
    guaranteeSubmitted: boolean;
    hasIntervention: boolean;
    hearingDraft: HearingDraftState;
    hearingsError: string | null;
    isDefendantClient: boolean;
    isFinalityNoGrievance: boolean;
    isFinalityTerminatedRequest: boolean;
    isFinalized: boolean;
    judgeDecision: JudgeDecision;
    judgeError: string | null;
    phase2FirstHearingDate: string;
    setActiveLifecycleStep: Dispatch<SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    setCassationData: Dispatch<SetStateAction<CassationData>>;
    setCassationDecision: Dispatch<SetStateAction<CassationDecision>>;
    setCassationExpiredConfirmed: Dispatch<SetStateAction<boolean>>;
    setDecisionNotificationModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditCassation: Dispatch<SetStateAction<boolean>>;
    setEditGrievance: Dispatch<SetStateAction<boolean>>;
    setGrievanceData: Dispatch<SetStateAction<GrievanceData>>;
    setGrievanceDecision: Dispatch<SetStateAction<GrievanceDecision>>;
    setGrievanceDetailsConfirmed: Dispatch<SetStateAction<boolean>>;
    setGrievanceExpiredConfirmed: Dispatch<SetStateAction<boolean>>;
    setGrievanceLegalEndDate: Dispatch<SetStateAction<string>>;
    setGuaranteeDetails: Dispatch<SetStateAction<{ amount: string; receiptNumber: string }>>;
    setGuaranteeSubmitted: Dispatch<SetStateAction<boolean>>;
    setHearingDraft: Dispatch<SetStateAction<HearingDraftState>>;
    setJudgeDecision: Dispatch<SetStateAction<JudgeDecision>>;
    setPhase2FirstHearingDate: Dispatch<SetStateAction<string>>;
};
