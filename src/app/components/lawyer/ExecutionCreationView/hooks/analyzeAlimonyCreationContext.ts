import {
    resolveAlimonyCalculatorInsights,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import { resolveOngoingAlimonyMonthlyDisplay } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import {
    collectAlimonyAmountFindings,
    buildAlimonyRecommendations,
    computeAlimonyCoherenceScore,
    buildAlimonyTimelineNarrative,
    buildAlimonySynthesisParts,
} from './alimonyCreationAmountFindings';
import { extractYmd } from './alimonyCreationAnalysisFormat';
import { collectAlimonyClaimStructureFindings } from './alimonyCreationClaimFindings';
import { collectAlimonyCoherenceFindings } from './alimonyCreationCoherenceFindings';
import { collectAlimonyTimelineFindings } from './alimonyCreationTimelineFindings';
import type {
    AlimonyCreationAnalysis,
    AlimonyCreationContextInput,
} from './alimonyCreationAnalysisTypes';

export type {
    AlimonyAnalysisSeverity,
    AlimonyAnalysisFinding,
    AlimonyAnalysisInference,
    AlimonyAnalysisRecommendation,
    AlimonyCreationContextInput,
} from './alimonyCreationAnalysisTypes';

/** تحليل سياقي شامل — استنتاج من البيانات والمنطق، لا توجيهات جاهزة */
export function analyzeAlimonyCreationContext(
    input: AlimonyCreationContextInput,
): AlimonyCreationAnalysis {
    const insights = resolveAlimonyCalculatorInsights({
        alimonyBeneficiary: input.alimonyBeneficiary,
        alimonyLawsuitDate: input.alimonyLawsuitDate,
        alimonyExecutionDate: input.alimonyExecutionDate,
        alimonyWifeMonthly: input.alimonyWifeMonthly,
        alimonyChildrenMonthly: input.alimonyChildrenMonthly,
        alimonyChildrenCount: input.alimonyChildrenCount,
        includesPastCalc: input.includesPastCalc,
        judgmentDate: input.judgmentDate,
        todayYmd: input.todayYmd,
    });

    const lawsuitYmd = insights.lawsuitDate;
    const executionYmd = insights.executionDate;
    const judgmentYmd = extractYmd(input.judgmentDate);
    const submissionYmd = extractYmd(input.submissionDate);
    const todayYmd = extractYmd(input.todayYmd ?? '') || extractYmd(new Date().toISOString());

    const effectiveTypes =
        input.activeClaimTypes && input.activeClaimTypes.length > 0
            ? input.activeClaimTypes
            : input.claimType
              ? [input.claimType]
              : [];

    const ongoingDisplay = resolveOngoingAlimonyMonthlyDisplay({
        claimType: input.claimType,
        claimTypes: effectiveTypes,
        monthlyWifeAlimony: parseFloat(input.alimonyWifeMonthly) || undefined,
        monthly_wife_alimony: parseFloat(input.alimonyWifeMonthly) || undefined,
        monthlyChildrenAlimony: parseFloat(input.alimonyChildrenMonthly) || undefined,
        monthly_children_alimony: parseFloat(input.alimonyChildrenMonthly) || undefined,
        children_count: parseInt(input.alimonyChildrenCount, 10) || undefined,
    });

    const projectedMonthlyIqd =
        input.calculatedAlimonyNew?.monthlyOngoing ?? ongoingDisplay.total ?? 0;

    let projectedAccumulatedIqd: number | null = null;
    if (input.calculatedAlimonyNew) {
        projectedAccumulatedIqd = Math.max(
            0,
            Math.round(input.calculatedAlimonyNew.totalAccumulated || input.calculatedAlimonyNew.baseAccumulation),
        );
    } else if (
        insights.isExecutionAfterLawsuit &&
        insights.daysBetween != null &&
        projectedMonthlyIqd > 0
    ) {
        projectedAccumulatedIqd = Math.round((projectedMonthlyIqd / 30) * insights.daysBetween);
    }

    const timeline = collectAlimonyTimelineFindings({
        insights,
        judgmentYmd,
        lawsuitYmd,
        executionYmd,
        todayYmd,
        docType: input.docType,
    });
    const claimStructure = collectAlimonyClaimStructureFindings({
        claimType: input.claimType,
        effectiveTypes,
        includesPastCalc: input.includesPastCalc,
        alimonyPastStartDate: input.alimonyPastStartDate,
        lawsuitYmd,
        executionYmd,
    });
    const coherenceFindings = collectAlimonyCoherenceFindings(input);
    const amounts = collectAlimonyAmountFindings({
        insights,
        calculatedAlimonyNew: input.calculatedAlimonyNew,
        projectedMonthlyIqd,
        projectedAccumulatedIqd,
        claimAmountNafqa: input.claimAmountNafqa,
        alimonyBeneficiary: input.alimonyBeneficiary,
        submissionYmd,
        executionYmd,
    });

    const findings = [
        ...timeline.findings,
        ...claimStructure.findings,
        ...coherenceFindings,
        ...amounts.findings,
    ];
    const inferences = [
        ...timeline.inferences,
        ...claimStructure.inferences,
        ...amounts.inferences,
    ];
    const recommendations = buildAlimonyRecommendations({
        insights,
        lawsuitYmd,
        todayYmd,
        judgmentYmd,
        docType: input.docType,
    });

    const hasPast = effectiveTypes.includes('نفقة ماضية') || input.includesPastCalc;

    const completenessFields = [
        lawsuitYmd,
        executionYmd,
        projectedMonthlyIqd > 0 ? '1' : '',
        hasPast ? extractYmd(input.alimonyPastStartDate) : 'skip',
    ].filter((f) => f !== 'skip');
    const filled = completenessFields.filter(Boolean).length;
    const completeness = Math.round((filled / completenessFields.length) * 100);

    const timelineNarrative = buildAlimonyTimelineNarrative({
        lawsuitYmd,
        executionYmd,
        insights,
    });
    const synthesisParts = buildAlimonySynthesisParts({
        effectiveTypes,
        timelineNarrative,
        projectedMonthlyIqd,
        projectedAccumulatedIqd,
        insights,
        hasPast: Boolean(hasPast),
    });

    const coherenceScore = computeAlimonyCoherenceScore(findings, insights);
    const priorityFinding =
        findings.find((f) => f.severity === 'critical') ??
        findings.find((f) => f.severity === 'warning') ??
        null;

    return {
        completeness,
        coherenceScore,
        priorityIssueId: priorityFinding?.id ?? inferences[0]?.id ?? null,
        synthesis: synthesisParts.join(' '),
        findings,
        inferences,
        recommendations,
        timelineNarrative,
        insights,
        projectedMonthlyIqd,
        projectedAccumulatedIqd,
    };
}
