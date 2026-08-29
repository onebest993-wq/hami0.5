import type {
    CaseHearing,
    CassationData,
    CassationDecision,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    HearingStage,
} from '../../types';

export type UseOrderFileLifecycleActionsArgs = {
    caseId: string | null;
    caseData: Record<string, unknown> | null | undefined;
    setCaseData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
    todayYmdValue: string;
    requestDateYmd: string;
    isFinalized: boolean;
    fileStatus: FileStatus;
    setFileStatus: React.Dispatch<React.SetStateAction<FileStatus>>;
    isSecretMode: boolean;
    setIsSecretMode: React.Dispatch<React.SetStateAction<boolean>>;
    hasIntervention: boolean;
    setHasIntervention: React.Dispatch<React.SetStateAction<boolean>>;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    setActiveLifecycleStep: React.Dispatch<React.SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    judgeDecision: JudgeDecision;
    setJudgeDecision: React.Dispatch<React.SetStateAction<JudgeDecision>>;
    executionData: import('../../types').ExecutionData;
    setExecutionData: React.Dispatch<React.SetStateAction<import('../../types').ExecutionData>>;
    grievanceData: GrievanceData;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    phase2FirstHearingDate: string;
    setPhase2FirstHearingDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceLegalEndDate: string;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceTimingConfirmed: boolean;
    setGrievanceTimingConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDetailsConfirmed: boolean;
    setGrievanceDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceExpiredConfirmed: boolean;
    setGrievanceExpiredConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDecision: GrievanceDecision;
    setGrievanceDecision: React.Dispatch<React.SetStateAction<GrievanceDecision>>;
    cassationData: CassationData;
    setCassationData: React.Dispatch<React.SetStateAction<CassationData>>;
    cassationDecision: CassationDecision;
    setCassationDecision: React.Dispatch<React.SetStateAction<CassationDecision>>;
    guaranteeSubmitted: boolean;
    setGuaranteeSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    guaranteeDetails: { amount: string; receiptNumber: string };
    hearings: CaseHearing[];
    setHearings: React.Dispatch<React.SetStateAction<CaseHearing[]>>;
    setPreDecisionClosed: React.Dispatch<React.SetStateAction<boolean>>;
    hearingDraft: {
        open: boolean;
        stage: HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    };
    setHearingDraft: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['hearingDraft']>>;
    expertModule: ExpertModule;
    setExpertModule: React.Dispatch<React.SetStateAction<ExpertModule>>;
    registrationData: {
        receiptNumber: string;
        receiptDate: string;
        notificationMethod: string;
        notificationDate: string;
    };
    setRegistrationData: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['registrationData']>>;
    pendingRegistrationSyncRef: React.MutableRefObject<boolean>;
    editJudge: boolean;
    setEditJudge: React.Dispatch<React.SetStateAction<boolean>>;
    editExecution: boolean;
    setEditExecution: React.Dispatch<React.SetStateAction<boolean>>;
    editRejectionNotice: boolean;
    setEditRejectionNotice: React.Dispatch<React.SetStateAction<boolean>>;
    editGrievance: boolean;
    setEditGrievance: React.Dispatch<React.SetStateAction<boolean>>;
    editCassation: boolean;
    setEditCassation: React.Dispatch<React.SetStateAction<boolean>>;
    setJudgeError: React.Dispatch<React.SetStateAction<string | null>>;
    setExecutionError: React.Dispatch<React.SetStateAction<string | null>>;
    setRejectionNoticeError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setHearingsError: React.Dispatch<React.SetStateAction<string | null>>;
    persistPatch: (patch: Record<string, unknown>) => void;
    flushPersistPatch: (patch: Record<string, unknown>) => Promise<void>;
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: import('../../types').CaseEvent['kind']) => void;
    requestConfirm: (message: string) => Promise<boolean>;
    showGrievanceStep: boolean;
    showPreDecisionHearings: boolean;
    preDecisionTerminateExists: boolean;
    isIqrarContext: boolean;
    isStateOrder: boolean;
    isCaseTerminated: boolean;
    hasSessions: boolean;
    grievanceLegalEndDateChronologyError: string | null;
    grievanceExpiredCanClose: boolean;
    grievanceClosingHearingExists: boolean;
    grievanceFilingDateChronologyError: string | null;
    grievanceFirstHearingDateChronologyError: string | null;
    grievanceDecisionDateChronologyError: string | null;
    judgeDecisionDateChronologyError: string | null;
    cassationFilingDateChronologyError: string | null;
    cassationDecisionDateError: string | null;
    cassationFilingDetailsComplete: boolean;
    phase1NewSessionMinYmd: string;
    phase2NewSessionMinYmd: string;
    effectiveJudgeDecisionDate: string;
    effectiveRejectionNotificationDate: string;
    grievanceTimingGateReady: boolean;
    grievanceFilingMinYmd: string;
    grievanceFirstHearingMinYmd: string;
    oppositeRole: (role: 'client' | 'opponent') => 'client' | 'opponent';
    partyLabel: (role: 'client' | 'opponent' | null) => string;
    computedGrievanceFiledBy: 'client' | 'opponent' | null;
    computedCassationFiledBy: 'client' | 'opponent' | null;
    phase2ActiveDate: string;
    grievanceWizardInputsLocked: boolean;
    grievanceProceedingsClosed: boolean;
    cassationExpiredCanClose: boolean;
    cassationExpiredConfirmed: boolean;
    defaultDeadlineDays: number;
    setGrievanceDecisionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievancePetitionNotificationDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievancePetitionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
};
