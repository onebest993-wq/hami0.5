import type { CaseFile, ExecutionArchiveFile, Party, Stage } from '@/app/types/common';

export type LooseArchiveFile = (CaseFile | ExecutionArchiveFile) & {
    claimType?: string;
    docType?: string;
    classification?: string;
    fileNumber?: string;
    caseNo?: string;
    caseNumber?: string;
    year?: number | string;
    fileYear?: number | string;
    creditor?: string;
    clientName?: string;
    debtor?: string;
    opponentName?: string;
    relationship?: string;
    linkedDebtor?: string;
    amount?: number;
    totalAmount?: number;
    lawyerFeesAmount?: number | string;
    courtFees?: number | string;
    directorateFees?: number | string;
    debtAmount?: number | string;
    eviction_case_expenses?: Array<{ amount?: number }>;
    eviction_premises_use?: 'commercial' | 'residential';
    property_number?: string;
    district?: string;
    property_type?: string;
    full_address?: string;
    timelineEvents?: Array<{ id?: string; title?: string; description?: string; date?: string; timestamp?: string }>;
    parties?: Party[];
    stages?: StageWithCaseMeta[];
    activeStageIndex?: number;
    court?: CaseFile['court'] | string;
    executionTrashDeletedAt?: string | null;
};

export type StageWithCaseMeta = Omit<Stage, 'status'> & {
    status?: Stage['status'] | 'voided' | 'abandoned';
    isVoided?: boolean;
    interruptionDate?: string;
    abandonmentDate?: string;
    finalDecision?: string;
    legalTimers?: {
        appealDeadline?: string;
        cassationDeadline?: string;
        reviewDeadline?: string;
        finalAppealDeadline?: string;
    };
};

type SmartTimers = {
    appeal?: number;
    cassation?: number;
    review?: number;
    finalAppeal?: number;
};

export type ComputedSmartStatus = {
    type: string;
    label: string;
    /** تلميح عند التمرير — للتفاصيل القانونية الكاملة */
    title?: string;
    color: string;
    bgColor: string;
    borderColor: string;
    timers: SmartTimers | null;
};

export type ArchiveEnrichedRow = LooseArchiveFile & {
    smartStatus: ComputedSmartStatus;
    unifiedCount?: number;
    unifiedTotalDemand?: number;
};
