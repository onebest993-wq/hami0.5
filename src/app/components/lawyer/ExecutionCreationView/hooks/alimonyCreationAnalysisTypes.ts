import type { AlimonyCalculationResult } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import type { AlimonyCalculatorInsights } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';

export type AlimonyAnalysisSeverity = 'info' | 'warning' | 'critical';

export type AlimonyAnalysisFinding = {
    id: string;
    category: 'timeline' | 'amount' | 'claim_structure' | 'cross_field' | 'legal';
    severity: AlimonyAnalysisSeverity;
    observation: string;
    evidence: string[];
};

export type AlimonyAnalysisInference = {
    id: string;
    conclusion: string;
    because: string[];
};

export type AlimonyAnalysisRecommendation = {
    id: string;
    action: string;
    rationale: string;
    apply?: { field: 'lawsuitDate' | 'executionDate'; value: string };
};

export type AlimonyCreationAnalysis = {
    completeness: number;
    coherenceScore: number;
    priorityIssueId: string | null;
    synthesis: string;
    findings: AlimonyAnalysisFinding[];
    inferences: AlimonyAnalysisInference[];
    recommendations: AlimonyAnalysisRecommendation[];
    timelineNarrative: string;
    insights: AlimonyCalculatorInsights;
    projectedMonthlyIqd: number;
    projectedAccumulatedIqd: number | null;
};

export type AlimonyCreationContextInput = {
    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    alimonyLawsuitDate: string;
    alimonyExecutionDate: string;
    alimonyWifeMonthly: string;
    alimonyChildrenMonthly: string;
    alimonyChildrenCount: string;
    calculatedAlimonyNew: AlimonyCalculationResult | null;
    includesPastCalc?: boolean;
    alimonyPastStartDate?: string;
    alimonyPastLawSystem?: string;
    judgmentDate?: string;
    docType?: string;
    claimType?: string;
    activeClaimTypes?: string[];
    submissionDate?: string;
    todayYmd?: string;
    /** مبلغ المطالبة المُدخل في النموذج — للمقارنة مع محرك الحاسبة */
    claimAmountNafqa?: string;
};
