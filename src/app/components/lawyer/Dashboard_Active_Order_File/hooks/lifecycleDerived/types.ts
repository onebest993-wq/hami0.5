import type {
    CaseHearing,
    CassationData,
    CassationDecision,
    ExpertModule,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
} from '../../types';

export type UseOrderFileLifecycleDerivedArgs = {
    caseData: Record<string, unknown> | null | undefined;
    judgeDecision: JudgeDecision;
    grievanceData: GrievanceData;
    grievanceDecision: GrievanceDecision;
    cassationData: CassationData;
    cassationDecision: CassationDecision;
    hearings: CaseHearing[];
    hearingDraft: {
        open: boolean;
        stage: import('../../types').HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    };
    expertModule: ExpertModule;
    phase2FirstHearingDate: string;
    grievanceLegalEndDate: string;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceTimingConfirmed: boolean;
    grievanceDetailsConfirmed: boolean;
    grievanceExpiredConfirmed: boolean;
    cassationExpiredConfirmed: boolean;
    editGrievance: boolean;
    requestDateYmd: string;
    todayYmdValue: string;
    hasIntervention: boolean;
    isFinalized: boolean;
    isFinalityNoGrievance: boolean;
    defenderPhase2ReadOnly: boolean;
    showGrievanceStep: boolean;
    isIqrarContext: boolean;
    partyLabel: (role: 'client' | 'opponent' | null) => string;
    computedGrievanceFiledBy: 'client' | 'opponent' | null;
    computedCassationFiledBy: 'client' | 'opponent' | null;
    showPreDecisionHearings: boolean;
    fileStatus: import('../../types').FileStatus;
};
