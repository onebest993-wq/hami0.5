import type { CaseStage } from '@/app/types/criminal';

export type CaseRecordPhase = 'investigation' | 'trial';
export type CasePhaseFilter = 'all' | 'investigation' | 'trial';

/** فلتر ذكي لقسم القرارات — مرحلة حالية/سابقة أو مرحلة محددة بوجود قرارات فعلية. */
export type DecisionsScopeFilter =
    | 'all'
    | 'current'
    | 'previous'
    | 'investigation'
    | 'misdemeanor'
    | 'felony';

export type DecisionsScopeOption = {
    value: DecisionsScopeFilter;
    label: string;
    count: number;
};

export type ScopeRecordItem = {
    date?: string;
    requestDate?: string;
    issuedAt?: string;
    attachmentDate?: string;
    proceduralNodeId?: string;
};

export type RecordPhaseLookupItem = {
    date?: string;
    requestDate?: string;
    issuedAt?: string;
    attachmentDate?: string;
    proceduralNodeId?: string;
};

export type { CaseStage };
