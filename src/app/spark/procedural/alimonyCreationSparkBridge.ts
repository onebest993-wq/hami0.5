import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import { EXECUTION_CREATION_DOSSIER_KEY } from '@/app/spark/context/executionCreationSparkContext';
import {
    analyzeAlimonyCreationContext,
    type AlimonyCreationAnalysis,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/analyzeAlimonyCreationContext';
import type { AlimonyCalculationResult } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';

function resolveCalculatedFromDraft(
    ctx: ExecutionCreationSparkContext,
): AlimonyCalculationResult | null {
    const snap = ctx.alimony?.calculated;
    if (!snap) return null;
    return {
        baseDurationMonths: 0,
        baseDurationDays: 0,
        baseAccumulation: snap.baseAccumulation,
        pastDurationDays: 0,
        pastDurationMonths: 0,
        pastDurationMonthsRaw: 0,
        pastYearCapApplied: snap.pastYearCapApplied,
        pastAccumulation: snap.pastAccumulation,
        pastMonthlyUsed: 0,
        wifeMonthlyOngoing: 0,
        childrenMonthlyOngoing: 0,
        wifeBaseAccumulation: 0,
        childrenBaseAccumulation: 0,
        totalAccumulated: snap.totalAccumulated,
        monthlyOngoing: snap.monthlyOngoing,
        legalCapApplied: snap.legalCapApplied,
        explanation: snap.explanation,
    };
}

export function analyzeExecutionCreationAlimony(
    ctx: ExecutionCreationSparkContext,
): AlimonyCreationAnalysis | null {
    if (!ctx.alimony) return null;
    const effectiveTypes =
        ctx.activeClaimTypes.length > 0
            ? ctx.activeClaimTypes
            : ctx.claimType
              ? [ctx.claimType]
              : [];
    const hasAlimonyClaim = effectiveTypes.some(
        (t) => t === 'نفقة' || t === 'حجة نفقة اتفاقية' || t === 'نفقة ماضية',
    );
    if (!hasAlimonyClaim) return null;

    const claimAmountNafqa =
        ctx.claimAmountsByType['نفقة'] ??
        ctx.claimAmountsByType['حجة نفقة اتفاقية'] ??
        ctx.claimAmountsByType['نفقة ماضية'] ??
        ctx.totalAmount;

    return analyzeAlimonyCreationContext({
        alimonyBeneficiary: ctx.alimony.beneficiary,
        alimonyLawsuitDate: ctx.alimony.lawsuitDate,
        alimonyExecutionDate: ctx.alimony.executionDate,
        alimonyWifeMonthly: ctx.alimony.wifeMonthly,
        alimonyChildrenMonthly: ctx.alimony.childrenMonthly,
        alimonyChildrenCount: ctx.alimony.childrenCount,
        calculatedAlimonyNew: resolveCalculatedFromDraft(ctx),
        includesPastCalc: ctx.alimony.includesPastCalc,
        alimonyPastStartDate: ctx.alimony.pastStartDate,
        judgmentDate: ctx.alimony.judgmentDate,
        docType: ctx.docType,
        claimType: ctx.claimType,
        activeClaimTypes: effectiveTypes,
        submissionDate: ctx.alimony.submissionDate,
        claimAmountNafqa,
    });
}

/** يحوّل التحليل السياقي إلى طابور تنبيهات — أولوية حسب الخطورة والتماسك */
export function buildAlimonyCreationSparkNudges(
    ctx: ExecutionCreationSparkContext,
    analysis: AlimonyCreationAnalysis,
): SparkNudge[] {
    const nudges: SparkNudge[] = [];
    const dossierKey = EXECUTION_CREATION_DOSSIER_KEY;

    const recFixExecution = analysis.recommendations.find(
        (r) => r.id === 'rec:fix-execution-date' || r.id === 'rec:set-execution-today',
    );

    const critical = analysis.findings.filter((f) => f.severity === 'critical');
    for (const f of critical) {
        nudges.push({
            id: `${dossierKey}:alimony:${f.id}`,
            kind: 'execution.creation_alimony_timeline',
            surface: 'execution',
            priority: 11,
            message: f.observation,
            presence: { present: f.evidence.slice(0, 2), missing: ['ترتيب زمني صحيح'] },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
            action: recFixExecution?.apply
                ? { label: 'تصحيح تاريخ الاحتساب', actionId: 'apply_alimony_execution_today' }
                : { label: 'مراجعة التواريخ', actionId: 'focus_alimony' },
        });
    }

    const crossWarnings = analysis.findings.filter(
        (f) => f.severity === 'warning' && f.category === 'cross_field',
    );
    for (const f of crossWarnings) {
        const isAmount = f.id === 'cross:claim-amount-mismatch';
        nudges.push({
            id: `${dossierKey}:alimony:${f.id}`,
            kind: 'execution.creation_alimony_insight',
            surface: 'execution',
            priority: 9,
            message: f.observation,
            presence: { present: f.evidence, missing: ['اتساق بين الحقول'] },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
            action: isAmount
                ? { label: 'مراجعة المبلغ', actionId: 'focus_claim_amount' }
                : { label: 'مراجعة الحقول', actionId: 'focus_alimony' },
        });
    }

    const timelineWarnings = analysis.findings.filter(
        (f) => f.severity === 'warning' && f.category === 'timeline',
    );
    for (const f of timelineWarnings) {
        nudges.push({
            id: `${dossierKey}:alimony:${f.id}`,
            kind: 'execution.creation_alimony_insight',
            surface: 'execution',
            priority: 8,
            message: f.observation,
            presence: { present: f.evidence, missing: ['تاريخ احتساب محدّث'] },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
            action: { label: 'تحديث الاحتساب لليوم', actionId: 'apply_alimony_execution_today' },
        });
    }

    const topInference = analysis.inferences[0];
    if (topInference && analysis.coherenceScore >= 40 && analysis.coherenceScore < 85) {
        nudges.push({
            id: `${dossierKey}:alimony:${topInference.id}`,
            kind: 'execution.creation_alimony_insight',
            surface: 'execution',
            priority: 7,
            message: topInference.conclusion,
            presence: { present: topInference.because.slice(0, 2), missing: [] },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
        });
    }

    if (analysis.completeness < 70 && analysis.coherenceScore > 0) {
        nudges.push({
            id: `${dossierKey}:alimony-incomplete`,
            kind: 'execution.creation_alimony_incomplete',
            surface: 'execution',
            priority: 5,
            message: analysis.synthesis,
            presence: {
                present: [`اكتمال ${analysis.completeness}%`, `تماسك ${analysis.coherenceScore}%`],
                missing: analysis.insights.missingFields,
            },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
            action: { label: 'إكمال بيانات النفقة', actionId: 'focus_alimony' },
        });
    }

    if (nudges.length === 0 && analysis.coherenceScore >= 85 && analysis.completeness >= 70) {
        nudges.push({
            id: `${dossierKey}:alimony-coherent`,
            kind: 'execution.creation_alimony_insight',
            surface: 'execution',
            priority: 3,
            message: analysis.sparkBrief,
            presence: {
                present: [`تماسك ${analysis.coherenceScore}%`],
                missing: [],
            },
            source: 'analyzeAlimonyCreationContext',
            dossierKey,
        });
    }

    return nudges.sort((a, b) => b.priority - a.priority);
}
