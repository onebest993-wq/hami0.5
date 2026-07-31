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

/** @deprecated use computePastAlimonyDuration — kept for tests */
export function computePastAlimonyDurationMonths(
    pastStartDate: string,
    endDate: string,
    pastLawSystem: AlimonyPastLawSystem,
) {
    const r = computePastAlimonyDuration(pastStartDate, endDate, pastLawSystem);
    return {
        billableMonths: r.billableMonths,
        rawMonths: r.rawMonths,
        pastYearCapApplied: r.pastYearCapApplied,
        totalDays: r.totalDays,
        billableDays: r.billableDays,
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
            return null;
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
