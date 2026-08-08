import type { SparkJurisdiction, SparkSurface } from '@/app/spark/types';

export type SparkCoherenceDateRole =
    | 'filing'
    | 'judgment'
    | 'execution'
    | 'deadline'
    | 'hearing'
    | 'discovery'
    | 'notification'
    | 'submission'
    | 'other';

export type SparkCoherenceSeverity = 'info' | 'warning' | 'critical';

export type SparkCoherenceCategory =
    | 'timeline'
    | 'amount'
    | 'claim_structure'
    | 'cross_field'
    | 'text'
    | 'action'
    | 'registry'
    | 'schedule'
    | 'legal';

export type SparkCoherenceFact = {
    id: string;
    key: string;
    value: string | number | boolean;
    source: string;
};

export type SparkCoherenceEvent = {
    id: string;
    date?: string;
    deadline?: string;
    title: string;
    notes?: string;
    source: string;
};

export type SparkCoherenceClaim = {
    id: string;
    type: string;
    amount?: number;
    party?: string;
    text?: string;
    source: string;
};

export type SparkCoherenceDate = {
    id: string;
    label: string;
    ymd: string;
    role: SparkCoherenceDateRole;
    source: string;
};

export type SparkCoherenceText = {
    id: string;
    role: string;
    content: string;
    source: string;
};

export type SparkCoherenceAction = {
    id: string;
    type: string;
    at?: string;
    label?: string;
    source: string;
};

/** حزمة سياق عامة — أي سطح يُحوَّل إليها */
export type SparkCoherenceContextBundle = {
    surface: SparkSurface;
    dossierKey: string;
    jurisdiction?: SparkJurisdiction;
    facts: SparkCoherenceFact[];
    events: SparkCoherenceEvent[];
    claims: SparkCoherenceClaim[];
    dates: SparkCoherenceDate[];
    texts: SparkCoherenceText[];
    actions: SparkCoherenceAction[];
    registeredDates?: string[];
    meta?: { caseNo?: string; court?: string; status?: string };
};

export type SparkCoherenceFinding = {
    id: string;
    category: SparkCoherenceCategory;
    severity: SparkCoherenceSeverity;
    observation: string;
    evidence: string[];
    relatedIds?: string[];
    actionId?: string;
    actionLabel?: string;
    /** معرّف مرفق خزنة عند اقتراح مراجعة مستند */
    targetFileId?: string;
};

export type SparkCoherenceInference = {
    id: string;
    conclusion: string;
    because: string[];
};

export type SparkCoherenceRecommendation = {
    id: string;
    action: string;
    rationale: string;
    actionId?: string;
};

export type SparkCoherenceReport = {
    coherenceScore: number;
    completeness: number;
    sparkBrief: string;
    priorityIssueId: string | null;
    synthesis: string;
    findings: SparkCoherenceFinding[];
    inferences: SparkCoherenceInference[];
    recommendations: SparkCoherenceRecommendation[];
};

export type SparkCoherenceRule = {
    id: string;
    surfaces?: SparkSurface[];
    run: (bundle: SparkCoherenceContextBundle) => SparkCoherenceFinding[];
};
