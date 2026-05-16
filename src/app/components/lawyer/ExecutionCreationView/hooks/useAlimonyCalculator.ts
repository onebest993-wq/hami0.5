import { useMemo } from 'react';

export function useAlimonyCalculator(
    claimType: string,
    alimonyLawsuitDate: string,
    alimonyExecutionDate: string,
    alimonyWifeMonthly: string,
    alimonyChildrenMonthly: string,
    alimonyChildrenCount: string,
    alimonyHasPastWife: boolean,
    alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري',
    alimonyPastStartDate: string,
) {
    const calculatedAlimonyNew = useMemo(() => {
        if (claimType !== 'نفقة' && claimType !== 'حجة نفقة اتفاقية') return null;

        const wifeMonthly = parseFloat(alimonyWifeMonthly) || 0;
        const childrenMonthly = parseFloat(alimonyChildrenMonthly) || 0;
        const childrenCount = parseInt(alimonyChildrenCount, 10) || 1;
        const lawsuit = new Date(alimonyLawsuitDate);
        const execution = new Date(alimonyExecutionDate);
        if (isNaN(lawsuit.getTime()) || isNaN(execution.getTime())) return null;
        if (execution <= lawsuit) return null;

        const monthsDiff =
            (execution.getFullYear() - lawsuit.getFullYear()) * 12 +
            (execution.getMonth() - lawsuit.getMonth());
        const daysDiff = Math.max(0, Math.floor(
            (execution.getTime() - lawsuit.getTime()) / (1000 * 60 * 60 * 24)
        ));

        const baseDurationMonths = Math.max(0, monthsDiff);
        const baseDurationDays = daysDiff % 30;
        const wifeBase = wifeMonthly * baseDurationMonths;
        const childrenBase = childrenMonthly * baseDurationMonths * childrenCount;
        const baseAccumulation = Math.round((wifeBase + childrenBase) / 1000) * 1000;

        let pastDurationMonths = 0;
        let pastAccumulation = 0;
        if (alimonyHasPastWife && alimonyPastLawSystem === 'الفقه الجعفري' && alimonyPastStartDate) {
            const pastStart = new Date(alimonyPastStartDate);
            if (!isNaN(pastStart.getTime()) && pastStart < execution) {
                pastDurationMonths =
                    (execution.getFullYear() - pastStart.getFullYear()) * 12 +
                    (execution.getMonth() - pastStart.getMonth());
                if (pastDurationMonths > 0) {
                    const wifePast = wifeMonthly * pastDurationMonths;
                    pastAccumulation = Math.round(wifePast / 1000) * 1000;
                }
            }
        }

        const totalAccumulated = baseAccumulation + pastAccumulation;
        const monthlyOngoing = wifeMonthly + childrenMonthly * childrenCount;

        const tenMillion = 10000000;
        const legalCapApplied = totalAccumulated > tenMillion;

        const explanation = [
            `النفقة الأساسية: ${wifeMonthly} د.ع/شهر للزوجة`,
            childrenCount > 0 ? `${childrenMonthly} د.ع/شهر × ${childrenCount} أولاد` : '',
            `المدة: ${baseDurationMonths} شهراً`,
            alimonyHasPastWife && alimonyPastLawSystem === 'الفقه الجعفري'
                ? `نفقة ماضية للزوجة (جعفري): ${pastDurationMonths} شهراً`
                : '',
            legalCapApplied ? 'تم تطبيق سقف 10,000,000 د.ع القانوني' : '',
        ].filter(Boolean).join(' — ');

        return {
            baseDurationMonths,
            baseDurationDays,
            baseAccumulation,
            pastDurationMonths,
            pastAccumulation,
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
    ]);

    return { calculatedAlimonyNew };
}
