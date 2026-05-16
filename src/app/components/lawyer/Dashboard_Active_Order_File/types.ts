export type FileStatus = 'pending' | 'accepted' | 'rejected' | 'executed' | 'grievance' | 'cassation';

export interface JudgeDecision {
    decision: 'accepted' | 'partially_accepted' | 'rejected' | null;
    decisionDate: string;
    requiresGuarantee: boolean;
}

export interface ExecutionData {
    executionDate: string;
    notificationDate: string;
    deadlineDays: number;
    authority: string;
    notes: string;
}

export interface GrievanceData {
    rejectionNotificationDate: string;
    outcome: 'filed' | 'expired' | '';
    filingDate: string;
}

export interface GrievanceDecision {
    decision: 'confirmed' | 'modified' | 'canceled' | null;
    decisionDate: string;
}

export interface CassationData {
    filedBy: 'client' | 'opponent' | null;
    outcome: 'filed' | 'expired' | '';
    filingDate: string;
    fileNumber: string;
}

export interface CassationDecision {
    decision: 'confirmed' | 'modified' | 'canceled' | null;
    decisionDate: string;
}

export type DeadlinePhase = 'inactive' | 'grievance-3days' | 'grievance-hearing' | 'cassation-7days' | 'final';

export type CaseNote = {
    id: string;
    text: string;
    createdAt: string;
};

export type CaseEvent = {
    id: string;
    kind: 'system' | 'action' | 'edit';
    message: string;
    createdAt: string;
};

export type CaseAttachment = {
    id: string;
    kind: 'file' | 'link';
    name: string;
    url?: string;
    createdAt: string;
};

export type CaseFollowup = {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    createdAt: string;
};

export type HearingStage = 'pre_decision' | 'grievance';

export type CaseHearing = {
    id: string;
    stage: HearingStage;
    sessionDate: string;
    notes: string;
    nextSessionDate: string;
    createdAt: string;
};

export type ExpertModule = {
    enabled: boolean;
    expertName: string;
    depositAmount: string;
    inspectionDate: string;
    reportDueDate: string;
    reportReceivedDate: string;
};

export type PreDecisionHearingOutcomeKind = 'adjourn' | 'close' | 'terminate';

export type ActiveOrderFileProps = {
    fileData: unknown;
    onClose: () => void;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
};
