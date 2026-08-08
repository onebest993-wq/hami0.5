export type ExecutionCreationPartyDraft = {
    name: string;
    address: string;
    isClient: boolean;
};

export type ExecutionCreationAlimonyDraft = {
    beneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    lawsuitDate: string;
    executionDate: string;
    wifeMonthly: string;
    childrenMonthly: string;
    childrenCount: string;
    includesPastCalc: boolean;
    pastStartDate: string;
    judgmentDate: string;
    submissionDate: string;
    calculated?: {
        baseAccumulation: number;
        pastAccumulation: number;
        monthlyOngoing: number;
        totalAccumulated: number;
        legalCapApplied: boolean;
        pastYearCapApplied: boolean;
        explanation: string;
    } | null;
};

export type ExecutionCreationSparkDraft = {
    directorate: string;
    fileNumber: string;
    docType: string;
    docNumber: string;
    judgmentDate: string;
    classification: string;
    claimType: string;
    activeClaimTypes: string[];
    claimAmountsByType: Record<string, string>;
    totalAmount: string;
    debtors: ExecutionCreationPartyDraft[];
    creditors: ExecutionCreationPartyDraft[];
    isDocumentBlocked: boolean;
    submissionDate: string;
    alimony?: ExecutionCreationAlimonyDraft | null;
};

export type ExecutionCreationSparkContext = ExecutionCreationSparkDraft & {
    dossierKey: 'creation:execution:draft';
};

export const EXECUTION_CREATION_DOSSIER_KEY = 'creation:execution:draft' as const;

export function buildExecutionCreationSparkContext(
    draft: ExecutionCreationSparkDraft,
): ExecutionCreationSparkContext {
    return { ...draft, dossierKey: EXECUTION_CREATION_DOSSIER_KEY };
}
