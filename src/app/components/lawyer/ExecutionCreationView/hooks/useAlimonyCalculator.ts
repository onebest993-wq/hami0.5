import { useMemo } from 'react';

export type AlimonyPastLawSystem = 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';

export type AlimonyCalculationResult = {
    baseDurationMonths: number;
    baseDurationDays: number;
    baseAccumulation: number;
    pastDurationDays: number;
    pastDurationMonths: number;
    pastDurationMonthsRaw: number;
    pastYearCapApplied: boolean;
    pastAccumulation: number;
    pastMonthlyUsed: number;
    wifeMonthlyOngoing: number;
    childrenMonthlyOngoing: number;
    wifeBaseAccumulation: number;
    childrenBaseAccumulation: number;
    totalAccumulated: number;
    monthlyOngoing: number;
    legalCapApplied: boolean;
    explanation: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_MONTH = 30;
const STATUTORY_PAST_ALIMONY_MAX_MONTHS = 12;
const STATUTORY_PAST_ALIMONY_MAX_DAYS = STATUTORY_PAST_ALIMONY_MAX_MONTHS * DAYS_PER_MONTH;

export function diffDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        return 0;
    }
    return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function roundAlimonyAmount(amount: number): number {
    return Math.round(amount / 1000) * 1000;
}

/** النفقة الماضية = (المبلغ الشهري ÷ 30) × عدد الأيام المحتسبة */
export function computePastAlimonyAmount(monthlyAmount: number, billableDays: number): number {
    if (billableDays <= 0 || monthlyAmount <= 0) return 0;
    return roundAlimonyAmount((monthlyAmount / DAYS_PER_MONTH) * billableDays);
}

export function computePastAlimonyDuration(
    pastStartDate: string,
    endDate: string,
    pastLawSystem: AlimonyPastLawSystem,
): {
    totalDays: number;
    billableDays: number;
    rawMonths: number;
    billableMonths: number;
    pastYearCapApplied: boolean;
} {
    const totalDays = diffDaysBetween(pastStartDate, endDate);
    if (totalDays <= 0) {
        return {
            totalDays: 0,
            billableDays: 0,
            rawMonths: 0,
            billableMonths: 0,
            pastYearCapApplied: false,
        };
    }

    const rawMonths = totalDays / DAYS_PER_MONTH;

    if (pastLawSystem === 'قانون الأحوال الشخصية 1959') {
        const pastYearCapApplied = totalDays > STATUTORY_PAST_ALIMONY_MAX_DAYS;
        const billableDays = Math.min(totalDays, STATUTORY_PAST_ALIMONY_MAX_DAYS);
        return {
            totalDays,
            billableDays,
            rawMonths,
            billableMonths: billableDays / DAYS_PER_MONTH,
            pastYearCapApplied,
        };
    }

    return {
        totalDays,
        billableDays: totalDays,
        rawMonths,
        billableMonths: rawMonths,
        pastYearCapApplied: false,
    };
}

export type AlimonyCalculatorInsightStatus =
    | 'ready'
    | 'missing_lawsuit_date'
    | 'missing_execution_date'
    | 'execution_before_lawsuit'
    | 'same_day'
    | 'missing_monthly_amounts'
    | 'awaiting_input';

export type AlimonyCalculatorInsights = {
    status: AlimonyCalculatorInsightStatus;
    lawsuitDate: string;
    executionDate: string;
    daysBetween: number | null;
    isExecutionAfterLawsuit: boolean;
    missingFields: string[];
    hints: string[];
    syncSummary: string;
};

function extractYmd(value: string): string {
    const v = String(value ?? '').trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

function formatYmdAr(ymd: string): string {
    const v = extractYmd(ymd);
    if (!v) return '—';
    const d = new Date(`${v}T12:00:00`);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function resolveAlimonyCalculatorInsights(params: {
    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    alimonyLawsuitDate: string;
    alimonyExecutionDate: string;
    alimonyWifeMonthly: string;
    alimonyChildrenMonthly: string;
    alimonyChildrenCount: string;
    includesPastCalc?: boolean;
    judgmentDate?: string;
    todayYmd?: string;
}): AlimonyCalculatorInsights {
    const lawsuitDate = extractYmd(params.alimonyLawsuitDate);
    const executionDate = extractYmd(params.alimonyExecutionDate);
    const judgmentYmd = extractYmd(params.judgmentDate ?? '');
    const todayYmd = extractYmd(params.todayYmd ?? '') || extractYmd(new Date().toISOString());

    const hints: string[] = [];
    const missingFields: string[] = [];

    if (!lawsuitDate) missingFields.push('تاريخ إقامة الدعوى');
    if (!executionDate) missingFields.push('تاريخ احتساب التنفيذ');

    const wifeMonthly = parseFloat(params.alimonyWifeMonthly) || 0;
    const childrenMonthly = parseFloat(params.alimonyChildrenMonthly) || 0;
    const childrenCount = parseInt(params.alimonyChildrenCount, 10) || 1;

    const needsWife =
        params.alimonyBeneficiary === 'زوجة فقط' || params.alimonyBeneficiary === 'زوجة وأولاد';
    const needsChildren =
        params.alimonyBeneficiary === 'أولاد فقط' || params.alimonyBeneficiary === 'زوجة وأولاد';

    if (needsWife && wifeMonthly <= 0) missingFields.push('نفقة الزوجة الشهرية');
    if (needsChildren && childrenMonthly <= 0) missingFields.push('نفقة الأولاد الشهرية');

    let daysBetween: number | null = null;
    let isExecutionAfterLawsuit = false;
    let status: AlimonyCalculatorInsightStatus = 'awaiting_input';

    if (!lawsuitDate) {
        status = 'missing_lawsuit_date';
        if (judgmentYmd) {
            hints.push(`يمكنك نسخ تاريخ الحكم (${formatYmdAr(judgmentYmd)}) كتاريخ إقامة الدعوى.`);
        }
        hints.push('تاريخ إقامة الدعوى هو نقطة بداية احتساب المتراكم حتى تاريخ التنفيذ.');
    } else if (!executionDate) {
        status = 'missing_execution_date';
        hints.push(`يمكن ضبط تاريخ الاحتساب إلى اليوم (${formatYmdAr(todayYmd)}).`);
    } else {
        if (executionDate < lawsuitDate) {
            status = 'execution_before_lawsuit';
            daysBetween = 0;
            hints.push(
                `تاريخ الاحتساب (${formatYmdAr(executionDate)}) يسبق تاريخ إقامة الدعوى (${formatYmdAr(lawsuitDate)}). يجب أن يكون الاحتساب في أو بعد يوم الإقامة.`,
            );
            hints.push(`اضبط تاريخ الاحتساب إلى اليوم (${formatYmdAr(todayYmd)}) أو تاريخ لاحق لإقامة الدعوى.`);
        } else if (executionDate === lawsuitDate) {
            status = 'same_day';
            daysBetween = 0;
            hints.push(
                `تاريخ الإقامة وتاريخ الاحتساب متطابقان (${formatYmdAr(lawsuitDate)}) — المتراكم الأساسي صفر، وتبقى النفقة الشهرية المستمرة.`,
            );
        } else {
            daysBetween = diffDaysBetween(lawsuitDate, executionDate);
            isExecutionAfterLawsuit = daysBetween > 0;

            if (missingFields.some((f) => f.includes('نفقة'))) {
                status = 'missing_monthly_amounts';
                hints.push(
                    `المدة المحتسبة: ${daysBetween} يوماً (من ${formatYmdAr(lawsuitDate)} إلى ${formatYmdAr(executionDate)}). أدخل المبالغ الشهرية لإظهار المتراكم.`,
                );
            } else {
                status = 'ready';
                hints.push(
                    `يُحتسب المتراكم من ${formatYmdAr(lawsuitDate)} (إقامة الدعوى) إلى ${formatYmdAr(executionDate)} (احتساب التنفيذ) — ${daysBetween} يوماً.`,
                );
            }
        }
    }

    if (params.includesPastCalc) {
        hints.push('النفقة الماضية تُحسب في قسم «نفقة ماضية» من الاستحقاق حتى إقامة الدعوى — مستقلة عن تاريخ الاحتساب.');
    }

    const syncSummary =
        status === 'ready' && daysBetween != null
            ? `${daysBetween} يوم متراكم + نفقة شهرية مستمرة`
            : status === 'execution_before_lawsuit'
              ? 'تعارض تواريخ — لا متراكم'
              : status === 'same_day'
                ? 'لا متراكم اليوم — نفقة شهرية فقط'
                : missingFields.length
                  ? `ينقص: ${missingFields.slice(0, 2).join('، ')}`
                  : 'أكمل الحقول للمزامنة اللحظية';

    return {
        status,
        lawsuitDate,
        executionDate,
        daysBetween,
        isExecutionAfterLawsuit,
        missingFields,
        hints,
        syncSummary,
    };
}

export function useAlimonyCalculator(
    claimType: string,
    alimonyLawsuitDate: string,
    alimonyExecutionDate: string,
    alimonyWifeMonthly: string,
    alimonyChildrenMonthly: string,
    alimonyChildrenCount: string,
    alimonyHasPastWife: boolean,
    alimonyPastLawSystem: AlimonyPastLawSystem,
    alimonyPastStartDate: string,
    alimonyPastWifeMonthly: string,
) {
    const calculatedAlimonyNew = useMemo(() => {
        if (claimType !== 'نفقة' && claimType !== 'حجة نفقة اتفاقية') return null;

        const wifeMonthly = parseFloat(alimonyWifeMonthly) || 0;
        const childrenMonthly = parseFloat(alimonyChildrenMonthly) || 0;
        const childrenCount = parseInt(alimonyChildrenCount, 10) || 1;
        const pastMonthly = parseFloat(alimonyPastWifeMonthly) || wifeMonthly;

        const lawsuit = new Date(alimonyLawsuitDate);
        const execution = new Date(alimonyExecutionDate);
        const hasValidExecution = !isNaN(execution.getTime());
        const hasValidLawsuit = !isNaN(lawsuit.getTime());
        const canCalcBase =
            hasValidExecution && hasValidLawsuit && execution > lawsuit;

        let baseDurationMonths = 0;
        let baseDurationDays = 0;
        let baseAccumulation = 0;
        let wifeBaseAccumulation = 0;
        let childrenBaseAccumulation = 0;

        const canCalcPast =
            alimonyHasPastWife &&
            alimonyPastStartDate &&
            pastMonthly > 0 &&
            hasValidLawsuit &&
            diffDaysBetween(alimonyPastStartDate, alimonyLawsuitDate) > 0;

        if (canCalcBase) {
            baseDurationDays = diffDaysBetween(alimonyLawsuitDate, alimonyExecutionDate);
            baseDurationMonths = baseDurationDays / DAYS_PER_MONTH;
            wifeBaseAccumulation = roundAlimonyAmount(wifeMonthly * baseDurationMonths);
            childrenBaseAccumulation = roundAlimonyAmount(
                childrenMonthly * childrenCount * baseDurationMonths,
            );
            baseAccumulation = wifeBaseAccumulation + childrenBaseAccumulation;
        } else if (!canCalcPast) {
            const monthlyOngoing = wifeMonthly + childrenMonthly * childrenCount;
            const hasPartialInput =
                alimonyLawsuitDate.trim() ||
                alimonyExecutionDate.trim() ||
                wifeMonthly > 0 ||
                childrenMonthly > 0;
            if (!hasPartialInput) return null;
            return {
                baseDurationMonths: 0,
                baseDurationDays: 0,
                baseAccumulation: 0,
                pastDurationDays: 0,
                pastDurationMonths: 0,
                pastDurationMonthsRaw: 0,
                pastYearCapApplied: false,
                pastAccumulation: 0,
                pastMonthlyUsed: pastMonthly,
                wifeMonthlyOngoing: wifeMonthly,
                childrenMonthlyOngoing: childrenMonthly * childrenCount,
                wifeBaseAccumulation: 0,
                childrenBaseAccumulation: 0,
                totalAccumulated: 0,
                monthlyOngoing,
                legalCapApplied: false,
                explanation: 'تعذّر احتساب المتراكم — راجع تواريخ الإقامة والاحتساب.',
            };
        }

        let pastDurationDays = 0;
        let pastDurationMonths = 0;
        let pastDurationMonthsRaw = 0;
        let pastAccumulation = 0;
        let pastYearCapApplied = false;

        if (canCalcPast) {
            // النفقة الماضية: من تاريخ الاستحقاق → تاريخ إقامة الدعوى (لا علاقة لتاريخ التنفيذ)
            const pastDuration = computePastAlimonyDuration(
                alimonyPastStartDate,
                alimonyLawsuitDate,
                alimonyPastLawSystem,
            );
            pastDurationDays = pastDuration.billableDays;
            pastDurationMonths = pastDuration.billableMonths;
            pastDurationMonthsRaw = pastDuration.rawMonths;
            pastYearCapApplied = pastDuration.pastYearCapApplied;
            pastAccumulation = computePastAlimonyAmount(pastMonthly, pastDuration.billableDays);
        }

        const totalAccumulated = baseAccumulation + pastAccumulation;
        const monthlyOngoing = wifeMonthly + childrenMonthly * childrenCount;

        const tenMillion = 10000000;
        const legalCapApplied = totalAccumulated > tenMillion;

        const pastLawLabel =
            alimonyPastLawSystem === 'قانون الأحوال الشخصية 1959'
                ? 'قانون 1959'
                : 'فقه جعفري';

        const explanation = [
            `النفقة الأساسية: ${wifeMonthly} د.ع/شهر للزوجة`,
            childrenCount > 0 ? `${childrenMonthly} د.ع/شهر × ${childrenCount} أولاد` : '',
            baseDurationDays > 0
                ? `مدة المتراكمة: ${baseDurationDays} يوم (${baseDurationMonths.toFixed(1)} شهر)`
                : '',
            alimonyHasPastWife && pastAccumulation > 0
                ? `نفقة ماضية (${pastLawLabel}): من الاستحقاق إلى إقامة الدعوى — ${pastDurationDays} يوم (${pastDurationMonths.toFixed(1)} شهر) — (${pastMonthly} ÷ 30) × ${pastDurationDays} د.ع${
                      pastYearCapApplied ? ' — طُبِّق حد السنة الواحدة' : ''
                  }`
                : '',
            legalCapApplied ? 'تم تطبيق سقف 10,000,000 د.ع القانوني' : '',
        ]
            .filter(Boolean)
            .join(' — ');

        return {
            baseDurationMonths,
            baseDurationDays,
            baseAccumulation,
            pastDurationDays,
            pastDurationMonths,
            pastDurationMonthsRaw,
            pastYearCapApplied,
            pastAccumulation,
            pastMonthlyUsed: pastMonthly,
            wifeMonthlyOngoing: wifeMonthly,
            childrenMonthlyOngoing: childrenMonthly * childrenCount,
            wifeBaseAccumulation,
            childrenBaseAccumulation,
            totalAccumulated,
            monthlyOngoing,
            legalCapApplied,
            explanation,
        };
    }, [
        claimType,
        alimonyLawsuitDate,
        alimonyExecutionDate,
        alimonyWifeMonthly,
        alimonyChildrenMonthly,
        alimonyChildrenCount,
        alimonyHasPastWife,
        alimonyPastLawSystem,
        alimonyPastStartDate,
        alimonyPastWifeMonthly,
    ]);

    return { calculatedAlimonyNew };
}
