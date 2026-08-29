import type { AlimonyCalculatorInsights } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import type { AlimonyCalculationResult } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import type {
    AlimonyAnalysisFinding,
    AlimonyAnalysisInference,
    AlimonyCreationContextInput,
} from './alimonyCreationAnalysisTypes';
import { extractYmd, formatYmdAr } from './alimonyCreationAnalysisFormat';

export function collectAlimonyAmountFindings(input: {
    insights: AlimonyCalculatorInsights;
    calculatedAlimonyNew: AlimonyCalculationResult | null;
    projectedMonthlyIqd: number;
    projectedAccumulatedIqd: number | null;
    claimAmountNafqa?: string;
    alimonyBeneficiary: AlimonyCreationContextInput['alimonyBeneficiary'];
    submissionYmd: string;
    executionYmd: string;
}): { findings: AlimonyAnalysisFinding[]; inferences: AlimonyAnalysisInference[] } {
    const findings: AlimonyAnalysisFinding[] = [];
    const inferences: AlimonyAnalysisInference[] = [];
    const { insights, calculatedAlimonyNew, projectedMonthlyIqd, projectedAccumulatedIqd } = input;

    if (insights.missingFields.length > 0) {
        findings.push({
            id: 'amount:missing',
            category: 'amount',
            severity: 'warning',
            observation: `بيانات مالية ناقصة: ${insights.missingFields.join('، ')}.`,
            evidence: [`المستفيد: ${input.alimonyBeneficiary}`],
        });
    }

    if (projectedMonthlyIqd > 0 && insights.isExecutionAfterLawsuit && insights.daysBetween) {
        inferences.push({
            id: 'inf:accumulation-formula',
            conclusion: `بمعدل ${projectedMonthlyIqd.toLocaleString('ar-IQ')} د.ع/شهر، المتراكم التقريبي للفترة ${insights.daysBetween} يوماً ≈ ${(projectedAccumulatedIqd ?? 0).toLocaleString('ar-IQ')} د.ع (÷30 يوم/شهر).`,
            because: [
                'الصيغة: (الشهري ÷ 30) × عدد الأيام بين الإقامة والاحتساب.',
                calculatedAlimonyNew
                    ? 'القيمة مأخوذة من محرك الحاسبة بعد التقريب.'
                    : 'تقدير أولي — يُحدَّث فور إدخال المبالغ.',
            ],
        });
    }

    if (calculatedAlimonyNew?.legalCapApplied) {
        findings.push({
            id: 'legal:cap-10m',
            category: 'legal',
            severity: 'warning',
            observation: 'المجموع يتجاوز سقف 10,000,000 د.ع — يُطبَّق التقريب القانوني في الحاسبة.',
            evidence: [],
        });
    }

    if (calculatedAlimonyNew && projectedAccumulatedIqd != null) {
        const engineTotal = Math.round(
            calculatedAlimonyNew.totalAccumulated ||
                calculatedAlimonyNew.baseAccumulation + calculatedAlimonyNew.pastAccumulation,
        );
        const drift = Math.abs(engineTotal - (projectedAccumulatedIqd ?? 0));
        if (engineTotal > 0 && drift > engineTotal * 0.05 && insights.isExecutionAfterLawsuit) {
            inferences.push({
                id: 'inf:engine-refined',
                conclusion: `محرك الحاسبة يُثبت المتراكم عند ${engineTotal.toLocaleString('ar-IQ')} د.ع بعد التقريب والقواعد القانونية.`,
                because: [
                    'التقدير الأولي يعتمد على ÷30 يوم/شهر قبل تطبيق التقريب.',
                    calculatedAlimonyNew.explanation
                        ? calculatedAlimonyNew.explanation
                        : 'القيمة النهائية من محرك الحاسبة أدق من التقدير السريع.',
                ],
            });
        }
    }

    const claimAmountParsed = parseFloat(String(input.claimAmountNafqa ?? '').replace(/,/g, '')) || 0;
    if (claimAmountParsed > 0 && calculatedAlimonyNew) {
        const engineTotal = Math.round(
            calculatedAlimonyNew.totalAccumulated ||
                calculatedAlimonyNew.baseAccumulation + calculatedAlimonyNew.pastAccumulation,
        );
        if (engineTotal > 0 && Math.abs(claimAmountParsed - engineTotal) > engineTotal * 0.02) {
            findings.push({
                id: 'cross:claim-amount-mismatch',
                category: 'cross_field',
                severity: 'warning',
                observation: `مبلغ المطالبة المُدخل (${claimAmountParsed.toLocaleString('ar-IQ')} د.ع) يختلف عن محرك الحاسبة (${engineTotal.toLocaleString('ar-IQ')} د.ع).`,
                evidence: ['راجع تطابق المبلغ مع المتراكم المحسوب قبل الحفظ.'],
            });
        }
    }

    if (input.submissionYmd && input.executionYmd && input.executionYmd < input.submissionYmd) {
        findings.push({
            id: 'cross:execution-before-submission',
            category: 'cross_field',
            severity: 'info',
            observation: 'تاريخ الاحتساب يسبق تاريخ تقديم الإضبارة في النموذج.',
            evidence: [
                `التقديم: ${formatYmdAr(input.submissionYmd)}`,
                `الاحتساب: ${formatYmdAr(input.executionYmd)}`,
            ],
        });
    }

    return { findings, inferences };
}

export function buildAlimonyRecommendations(input: {
    insights: AlimonyCalculatorInsights;
    lawsuitYmd: string;
    todayYmd: string;
    judgmentYmd: string;
    docType?: string;
}): import('./alimonyCreationAnalysisTypes').AlimonyAnalysisRecommendation[] {
    const recommendations: import('./alimonyCreationAnalysisTypes').AlimonyAnalysisRecommendation[] = [];
    const { insights, lawsuitYmd, todayYmd, judgmentYmd } = input;

    if (insights.status === 'execution_before_lawsuit') {
        recommendations.push({
            id: 'rec:fix-execution-date',
            action: `جعل تاريخ الاحتساب ≥ ${formatYmdAr(lawsuitYmd)}`,
            rationale:
                'المتراكم الأساسي يُبنى على ترتيب زمني صحيح: الإقامة أولاً ثم الاحتساب.',
            apply: lawsuitYmd > todayYmd ? { field: 'executionDate', value: lawsuitYmd } : { field: 'executionDate', value: todayYmd },
        });
    } else if (insights.status === 'missing_execution_date') {
        recommendations.push({
            id: 'rec:set-execution-today',
            action: `تعيين الاحتساب إلى ${formatYmdAr(todayYmd)}`,
            rationale: 'تاريخ الاحتساب يمثل نهاية فترة المطالبة — عادةً تاريخ فتح التنفيذ أو اليوم.',
            apply: { field: 'executionDate', value: todayYmd },
        });
    }

    if (!lawsuitYmd && judgmentYmd && /حكم|قرار/i.test(String(input.docType ?? ''))) {
        recommendations.push({
            id: 'rec:derive-lawsuit-from-context',
            action: 'مراجعة تاريخ إقامة الدعوى مقابل تاريخ الحكم',
            rationale:
                'السند من نوع حكم — إقامة الدعوى غالباً تسبق الحكم؛ لا تخلط بينهما تلقائياً إلا بعد مراجعة الوقائع.',
        });
    }

    return recommendations;
}

export function computeAlimonyCoherenceScore(
    findings: AlimonyAnalysisFinding[],
    insights: AlimonyCalculatorInsights,
): number {
    if (insights.status === 'execution_before_lawsuit') return 0;
    let score = 100;
    for (const f of findings) {
        if (f.severity === 'critical') score -= 45;
        else if (f.severity === 'warning') score -= 18;
        else score -= 4;
    }
    if (insights.missingFields.length > 0) {
        score -= insights.missingFields.length * 8;
    }
    return Math.max(0, Math.min(100, score));
}

export function buildAlimonyTimelineNarrative(input: {
    lawsuitYmd: string;
    executionYmd: string;
    insights: AlimonyCalculatorInsights;
}): string {
    const { lawsuitYmd, executionYmd, insights } = input;
    return lawsuitYmd && executionYmd
        ? insights.isExecutionAfterLawsuit
            ? `من إقامة الدعوى (${formatYmdAr(lawsuitYmd)}) حتى احتساب التنفيذ (${formatYmdAr(executionYmd)}): ${insights.daysBetween} يوماً.`
            : insights.status === 'execution_before_lawsuit'
              ? `تعارض: الاحتساب (${formatYmdAr(executionYmd)}) قبل الإقامة (${formatYmdAr(lawsuitYmd)}).`
              : `نفس يوم الإقامة والاحتساب (${formatYmdAr(lawsuitYmd)}).`
        : 'الخط الزمني غير مكتمل — أدخل تواريخ الإقامة والاحتساب.';
}

export function buildAlimonySynthesisParts(input: {
    effectiveTypes: string[];
    timelineNarrative: string;
    projectedMonthlyIqd: number;
    projectedAccumulatedIqd: number | null;
    insights: AlimonyCalculatorInsights;
    hasPast: boolean;
}): string[] {
    const synthesisParts: string[] = [];
    if (input.effectiveTypes.length) {
        synthesisParts.push(`المطالبات: ${input.effectiveTypes.join(' + ')}.`);
    }
    synthesisParts.push(input.timelineNarrative);
    if (input.projectedMonthlyIqd > 0) {
        synthesisParts.push(`النفقة الشهرية المستمرة: ${input.projectedMonthlyIqd.toLocaleString('ar-IQ')} د.ع.`);
    }
    if (input.projectedAccumulatedIqd != null && input.projectedAccumulatedIqd > 0) {
        synthesisParts.push(`المتراكم المتوقع: ${input.projectedAccumulatedIqd.toLocaleString('ar-IQ')} د.ع.`);
    } else if (input.insights.status === 'execution_before_lawsuit') {
        synthesisParts.push('لا متراكم أساسي حتى يُصحَّح ترتيب التواريخ.');
    }
    if (input.hasPast) {
        synthesisParts.push('مسار النفقة الماضية منفصل — راجع قسم «نفقة ماضية» إن وُجد.');
    }
    return synthesisParts;
}

/** Completeness helper — kept with amount/synthesis helpers for shared date extraction. */
export { extractYmd };
