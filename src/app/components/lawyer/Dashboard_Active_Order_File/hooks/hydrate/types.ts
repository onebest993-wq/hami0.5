import type {
    CaseAttachment,
    CaseEvent,
    CaseFollowup,
    CaseHearing,
    CaseNote,
    CassationData,
    CassationDecision,
    ExecutionData,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
} from '../../types';

export type OrderFileHydrateSetters = {
    setCaseData: React.Dispatch<React.SetStateAction<any>>;
    setHasIntervention: React.Dispatch<React.SetStateAction<boolean>>;
    setFileStatus: React.Dispatch<React.SetStateAction<FileStatus>>;
    setIsSecretMode: React.Dispatch<React.SetStateAction<boolean>>;
    setActiveLifecycleStep: React.Dispatch<React.SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    setJudgeDecision: React.Dispatch<React.SetStateAction<JudgeDecision>>;
    setExecutionData: React.Dispatch<React.SetStateAction<ExecutionData>>;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievanceDecisionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievancePetitionNotificationDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievancePetitionNotificationConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievanceTimingConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setGrievanceDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    setPhase2FirstHearingDate: React.Dispatch<React.SetStateAction<string>>;
    setGrievanceDecision: React.Dispatch<React.SetStateAction<GrievanceDecision>>;
    setCassationData: React.Dispatch<React.SetStateAction<CassationData>>;
    setCassationDecision: React.Dispatch<React.SetStateAction<CassationDecision>>;
    setGuaranteeSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    setGuaranteeDetails: React.Dispatch<React.SetStateAction<{ amount: string; receiptNumber: string }>>;
    setHearings: React.Dispatch<React.SetStateAction<CaseHearing[]>>;
    setExpertModule: React.Dispatch<React.SetStateAction<ExpertModule>>;
    setPreDecisionClosed: React.Dispatch<React.SetStateAction<boolean>>;
    setExpectedDecisionDate: React.Dispatch<React.SetStateAction<string>>;
    setRegistrationData: React.Dispatch<
        React.SetStateAction<{
            receiptNumber: string;
            receiptDate: string;
            notificationMethod: string;
            notificationDate: string;
        }>
    >;
    setCaseEvents: React.Dispatch<React.SetStateAction<CaseEvent[]>>;
    setCaseNotes: React.Dispatch<React.SetStateAction<CaseNote[]>>;
    setCaseAttachments: React.Dispatch<React.SetStateAction<CaseAttachment[]>>;
    setCaseFollowups: React.Dispatch<React.SetStateAction<CaseFollowup[]>>;
};

export type UseOrderFileHydrateArgs = {
    caseId: string | null;
    userId: string;
    fileData: unknown;
    caseData: any;
    setters: OrderFileHydrateSetters;
};
