import type { AlimonyCalculationResult } from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import {
    diffDaysBetween,
    resolveAlimonyCalculatorInsights,
    type AlimonyCalculatorInsights,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import { resolveOngoingAlimonyMonthlyDisplay } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { isPastAlimonyOnlyClaim } from '@/app/utils/alimonyFinancialBreakdown';

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
    sparkBrief: string;
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

function extractYmd(value: string | undefined): string {
    const v = String(value ?? '').trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

function formatYmdAr(ymd: string): string {
    if (!ymd) return '—';
    const d = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

    const findings: AlimonyAnalysisFinding[] = [];
    const inferences: AlimonyAnalysisInference[] = [];
    const recommendations: AlimonyAnalysisRecommendation[] = [];

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

    // --- Timeline findings ---
    if (lawsuitYmd && executionYmd) {
        findings.push({
            id: 'timeline:range',
            category: 'timeline',
            severity: insights.status === 'execution_before_lawsuit' ? 'critical' : 'info',
            observation:
                insights.status === 'execution_before_lawsuit'
                    ? 'تسلسل التواريخ معكوس — لا يمكن بناء متراكم أساسي على هذا الأساس.'
                    : insights.status === 'same_day'
                      ? 'الإقامة والاحتساب في يوم واحد — المتراكم الأساسي صفر افتراضياً.'
                      : `الفترة بين الإقامة والاحتساب: ${insights.daysBetween} يوماً.`,
            evidence: [
                `إقامة الدعوى: ${formatYmdAr(lawsuitYmd)}`,
                `احتساب التنفيذ: ${formatYmdAr(executionYmd)}`,
            ],
        });
    }

    if (judgmentYmd && lawsuitYmd && judgmentYmd !== lawsuitYmd) {
        const gap = diffDaysBetween(
            judgmentYmd < lawsuitYmd ? judgmentYmd : lawsuitYmd,
            judgmentYmd < lawsuitYmd ? lawsuitYmd : judgmentYmd,
        );
        findings.push({
            id: 'cross:judgment-lawsuit',
            category: 'cross_field',
            severity: Math.abs(gap) > 365 ? 'warning' : 'info',
            observation: `تاريخ الحكم (${formatYmdAr(judgmentYmd)}) يختلف عن تاريخ إقامة الدعوى (${formatYmdAr(lawsuitYmd)}).`,
            evidence: [
                `الفارق: ${gap} يوماً`,
                input.docType ? `نوع السند: ${input.docType}` : 'نوع السند غير محدد',
            ],
        });
        inferences.push({
            id: 'inf:judgment-lawsuit',
            conclusion:
                'إقامة الدعوى وتاريخ الحكم يخدمان غرضاً مختلفاً — تأكد أن إقامة الدعوى تعكس بدء التقاضي لا صدور الحكم.',
            because: [
                'المتراكم الأساسي يُحسب من إقامة الدعوى إلى تاريخ الاحتساب.',
                'تاريخ الحكم يثبت الحق القضائي لا بالضرورة يوم رفع الدعوى.',
            ],
        });
    }

    if (executionYmd && executionYmd !== todayYmd) {
        const drift = diffDaysBetween(executionYmd, todayYmd);
        if (drift > 30) {
            findings.push({
                id: 'timeline:execution-stale',
                category: 'timeline',
                severity: 'warning',
                observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) أقدم من اليوم بـ ${drift} يوماً.`,
                evidence: [`اليوم: ${formatYmdAr(todayYmd)}`],
            });
        }
    }

    // --- Claim structure ---
    const pastOnly = isPastAlimonyOnlyClaim(input.claimType, effectiveTypes);
    const hasOngoing = effectiveTypes.some((t) => t === 'نفقة' || t === 'حجة نفقة اتفاقية');
    const hasPast = effectiveTypes.includes('نفقة ماضية') || input.includesPastCalc;

    if (hasPast && hasOngoing) {
        inferences.push({
            id: 'inf:dual-track',
            conclusion:
                'الإضبارة تجمع مسارين: نفقة متراكمة مستمرة (إقامة → احتساب) ونفقة ماضية (استحقاق → إقامة) — كل مسار له منطق زمني مستقل.',
            because: [
                'المتراكم الأساسي لا يشمل النفقة الماضية.',
                'النفقة الماضية تُسجّل في مطالبة منفصلة أو قسم «نفقة ماضية».',
            ],
        });
    }

    if (hasPast && !extractYmd(input.alimonyPastStartDate)) {
        findings.push({
            id: 'claim:past-start-missing',
            category: 'claim_structure',
            severity: 'warning',
            observation: 'مطالبة النفقة الماضية مفعّلة دون تاريخ استحقاق.',
            evidence: effectiveTypes.length ? effectiveTypes : [input.claimType ?? ''],
        });
    }

    if (pastOnly && lawsuitYmd && executionYmd && lawsuitYmd !== executionYmd) {
        findings.push({
            id: 'claim:past-only-execution-date',
            category: 'claim_structure',
            severity: 'info',
            observation:
                'في مطالبة «نفقة ماضية» فقط، تاريخ احتساب التنفيذ لا يدخل صيغة النفقة الماضية — يبقى ذا صلة بالإجراء لا بالمبلغ الماضي.',
            evidence: [`إقامة الدعوى: ${formatYmdAr(lawsuitYmd)}`],
        });
    }

    // --- Beneficiary & field coherence ---
    const wifeAmt = parseFloat(input.alimonyWifeMonthly) || 0;
    const childrenAmt = parseFloat(input.alimonyChildrenMonthly) || 0;
    const childrenCount = parseInt(input.alimonyChildrenCount, 10) || 0;

    if (input.alimonyBeneficiary === 'زوجة فقط' && childrenAmt > 0) {
        findings.push({
            id: 'coherence:wife-only-children-amount',
            category: 'cross_field',
            severity: 'warning',
            observation: 'المستفيد «زوجة فقط» لكن نفقة الأولاد مُدخلة — تناقض في بنية المطالبة.',
            evidence: [`نفقة الأولاد: ${childrenAmt.toLocaleString('ar-IQ')} د.ع`],
        });
    }
    if (input.alimonyBeneficiary === 'أولاد فقط' && wifeAmt > 0) {
        findings.push({
            id: 'coherence:children-only-wife-amount',
            category: 'cross_field',
            severity: 'warning',
            observation: 'المستفيد «أولاد فقط» لكن نفقة الزوجة مُدخلة — تناقض في بنية المطالبة.',
            evidence: [`نفقة الزوجة: ${wifeAmt.toLocaleString('ar-IQ')} د.ع`],
        });
    }
    if (
        (input.alimonyBeneficiary === 'أولاد فقط' || input.alimonyBeneficiary === 'زوجة وأولاد') &&
        childrenCount < 1
    ) {
        findings.push({
            id: 'coherence:children-count-missing',
            category: 'amount',
            severity: 'warning',
            observation: 'عدد الأولاد غير محدد رغم تضمينهم ضمن المستفيدين.',
            evidence: [],
        });
    }

    if (judgmentYmd && executionYmd && executionYmd < judgmentYmd) {
        findings.push({
            id: 'cross:execution-before-judgment',
            category: 'cross_field',
            severity: 'info',
            observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) يسبق تاريخ الحكم (${formatYmdAr(judgmentYmd)}).`,
            evidence: ['الاحتساب عادةً يعكس فتح التنفيذ أو اليوم — ليس ما قبل صدور الحكم.'],
        });
    }

    const pastStartYmd = extractYmd(input.alimonyPastStartDate);
    if (hasPast && pastStartYmd && lawsuitYmd && pastStartYmd >= lawsuitYmd) {
        findings.push({
            id: 'claim:past-start-after-lawsuit',
            category: 'claim_structure',
            severity: 'warning',
            observation: 'تاريخ استحقاق النفقة الماضية لا يجب أن يكون بعد إقامة الدعوى.',
            evidence: [
                `استحقاق: ${formatYmdAr(pastStartYmd)}`,
                `إقامة: ${formatYmdAr(lawsuitYmd)}`,
            ],
        });
    }

    if (executionYmd && executionYmd > todayYmd) {
        findings.push({
            id: 'timeline:execution-future',
            category: 'timeline',
            severity: 'warning',
            observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) في المستقبل.`,
            evidence: [`اليوم: ${formatYmdAr(todayYmd)}`],
        });
    }

    // --- Amounts ---
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
                input.calculatedAlimonyNew
                    ? 'القيمة مأخوذة من محرك الحاسبة بعد التقريب.'
                    : 'تقدير أولي — يُحدَّث فور إدخال المبالغ.',
            ],
        });
    }

    if (input.calculatedAlimonyNew?.legalCapApplied) {
        findings.push({
            id: 'legal:cap-10m',
            category: 'legal',
            severity: 'warning',
            observation: 'المجموع يتجاوز سقف 10,000,000 د.ع — يُطبَّق التقريب القانوني في الحاسبة.',
            evidence: [],
        });
    }

    // --- محرك الحاسبة vs التقدير الأولي ---
    if (input.calculatedAlimonyNew && projectedAccumulatedIqd != null) {
        const engineTotal = Math.round(
            input.calculatedAlimonyNew.totalAccumulated ||
                input.calculatedAlimonyNew.baseAccumulation + input.calculatedAlimonyNew.pastAccumulation,
        );
        const drift = Math.abs(engineTotal - (projectedAccumulatedIqd ?? 0));
        if (engineTotal > 0 && drift > engineTotal * 0.05 && insights.isExecutionAfterLawsuit) {
            inferences.push({
                id: 'inf:engine-refined',
                conclusion: `محرك الحاسبة يُثبت المتراكم عند ${engineTotal.toLocaleString('ar-IQ')} د.ع بعد التقريب والقواعد القانونية.`,
                because: [
                    'التقدير الأولي يعتمد على ÷30 يوم/شهر قبل تطبيق التقريب.',
                    input.calculatedAlimonyNew.explanation
                        ? input.calculatedAlimonyNew.explanation
                        : 'القيمة النهائية من محرك الحاسبة أدق من التقدير السريع.',
                ],
            });
        }
    }

    const claimAmountParsed = parseFloat(String(input.claimAmountNafqa ?? '').replace(/,/g, '')) || 0;
    if (claimAmountParsed > 0 && input.calculatedAlimonyNew) {
        const engineTotal = Math.round(
            input.calculatedAlimonyNew.totalAccumulated ||
                input.calculatedAlimonyNew.baseAccumulation + input.calculatedAlimonyNew.pastAccumulation,
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

    // --- Recommendations (derived, not scripted) ---
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

    if (submissionYmd && executionYmd && executionYmd < submissionYmd) {
        findings.push({
            id: 'cross:execution-before-submission',
            category: 'cross_field',
            severity: 'info',
            observation: 'تاريخ الاحتساب يسبق تاريخ تقديم الإضبارة في النموذج.',
            evidence: [
                `التقديم: ${formatYmdAr(submissionYmd)}`,
                `الاحتساب: ${formatYmdAr(executionYmd)}`,
            ],
        });
    }

    const completenessFields = [
        lawsuitYmd,
        executionYmd,
        projectedMonthlyIqd > 0 ? '1' : '',
        hasPast ? extractYmd(input.alimonyPastStartDate) : 'skip',
    ].filter((f) => f !== 'skip');
    const filled = completenessFields.filter(Boolean).length;
    const completeness = Math.round((filled / completenessFields.length) * 100);

    const timelineNarrative = lawsuitYmd && executionYmd
        ? insights.isExecutionAfterLawsuit
            ? `من إقامة الدعوى (${formatYmdAr(lawsuitYmd)}) حتى احتساب التنفيذ (${formatYmdAr(executionYmd)}): ${insights.daysBetween} يوماً.`
            : insights.status === 'execution_before_lawsuit'
              ? `تعارض: الاحتساب (${formatYmdAr(executionYmd)}) قبل الإقامة (${formatYmdAr(lawsuitYmd)}).`
              : `نفس يوم الإقامة والاحتساب (${formatYmdAr(lawsuitYmd)}).`
        : 'الخط الزمني غير مكتمل — أدخل تواريخ الإقامة والاحتساب.';

    const synthesisParts: string[] = [];
    if (effectiveTypes.length) {
        synthesisParts.push(`المطالبات: ${effectiveTypes.join(' + ')}.`);
    }
    synthesisParts.push(timelineNarrative);
    if (projectedMonthlyIqd > 0) {
        synthesisParts.push(`النفقة الشهرية المستمرة: ${projectedMonthlyIqd.toLocaleString('ar-IQ')} د.ع.`);
    }
    if (projectedAccumulatedIqd != null && projectedAccumulatedIqd > 0) {
        synthesisParts.push(`المتراكم المتوقع: ${projectedAccumulatedIqd.toLocaleString('ar-IQ')} د.ع.`);
    } else if (insights.status === 'execution_before_lawsuit') {
        synthesisParts.push('لا متراكم أساسي حتى يُصحَّح ترتيب التواريخ.');
    }
    if (hasPast) {
        synthesisParts.push('مسار النفقة الماضية منفصل — راجع قسم «نفقة ماضية» إن وُجد.');
    }

    const coherenceScore = computeAlimonyCoherenceScore(findings, insights);
    const priorityFinding =
        findings.find((f) => f.severity === 'critical') ??
        findings.find((f) => f.severity === 'warning') ??
        null;
    const sparkBrief = priorityFinding
        ? priorityFinding.observation
        : inferences[0]?.conclusion ??
          (coherenceScore >= 85
              ? 'السياق الزمني والمالي متسق — راجع المقترحات قبل الحفظ.'
              : synthesisParts[0] ?? 'تحليل النفقة جارٍ.');

    return {
        completeness,
        coherenceScore,
        sparkBrief,
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

function computeAlimonyCoherenceScore(
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
