import type { AlimonyFinancialBreakdown } from '@/app/components/lawyer/AlimonyFinancialBlock';
import type { ExecutionFile } from '@/app/types/execution';
import {
    computePastAlimonyAmount,
    computePastAlimonyDuration,
    type AlimonyPastLawSystem,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';

export type PastAlimonyClaimSnapshot = {
    amount?: number;
    calculatedMonths?: number;
    pastDurationDays?: number;
    pastStartDate?: string;
    lawsuitDate?: string;
    pastLawSystem?: string;
    pastWifeMonthly?: string | number;
    pastYearCapApplied?: boolean;
};

type AlimonyCalculatedSnapshot = {
    baseDurationMonths?: number;
    baseDurationDays?: number;
    baseAccumulation?: number;
    wifeBaseAccumulation?: number;
    childrenBaseAccumulation?: number;
    pastDurationDays?: number;
    pastDurationMonths?: number;
    pastAccumulation?: number;
    totalAccumulated?: number;
};

function roundMoney(n: unknown): number {
    const v = Math.round(Number(n) || 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
}

function parseMonthly(raw: unknown): number {
    const n = parseFloat(String(raw ?? '').replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** إعادة احتساب النفقة الماضية من التواريخ المحفوظة (للإضابير القديمة) */
export function recomputePastAlimonyFromClaim(
    pastClaim: PastAlimonyClaimSnapshot | undefined,
    fallbackMonthly?: unknown,
    fallbackLawsuitDate?: string
): { amount: number; pastDurationDays: number; pastDurationMonths: number } | null {
    if (!pastClaim?.pastStartDate) return null;
    const lawsuitDate = String(pastClaim.lawsuitDate ?? fallbackLawsuitDate ?? '').trim();
    if (!lawsuitDate) return null;

    const monthly =
        parseMonthly(pastClaim.pastWifeMonthly) || parseMonthly(fallbackMonthly);
    if (monthly <= 0) return null;

    const lawSystem =
        (pastClaim.pastLawSystem as AlimonyPastLawSystem) || 'قانون الأحوال الشخصية 1959';
    const duration = computePastAlimonyDuration(
        pastClaim.pastStartDate,
        lawsuitDate,
        lawSystem
    );
    if (duration.billableDays <= 0) return null;

    return {
        amount: computePastAlimonyAmount(monthly, duration.billableDays),
        pastDurationDays: duration.billableDays,
        pastDurationMonths: duration.billableMonths,
    };
}

/** مطالبة نفقة ماضية منفصلة — بدون نفقة مستمرة/متراكمة */
export function isPastAlimonyOnlyClaim(
    claimType?: string,
    claimTypes?: string[] | null
): boolean {
    const types =
        Array.isArray(claimTypes) && claimTypes.length > 0
            ? claimTypes.map((t) => String(t).trim()).filter(Boolean)
            : String(claimType || '').trim()
              ? [String(claimType).trim()]
              : [];
    if (types.length === 0) return false;
    const hasPastStandalone = types.includes('نفقة ماضية');
    const hasOngoingAlimony = types.some((t) => t === 'نفقة' || t === 'حجة نفقة اتفاقية');
    return hasPastStandalone && !hasOngoingAlimony;
}

/** يبني تفصيل النفقة (متراكمة + ماضية) من بيانات الإضبارة — يدعم مطالبة «نفقة ماضية» المنفصلة */
export function resolveAlimonyFinancialBreakdown(
    executionData: ExecutionFile | null | undefined
): AlimonyFinancialBreakdown | null {
    if (!executionData) return null;

    const calc = (executionData.alimony as { calculated?: AlimonyCalculatedSnapshot } | undefined)
        ?.calculated;
    const pastClaim = (executionData as { pastAlimonyClaim?: PastAlimonyClaimSnapshot })
        .pastAlimonyClaim;

    const recomputed = recomputePastAlimonyFromClaim(
        pastClaim,
        (executionData.alimony as { pastWifeMonthly?: string } | undefined)?.pastWifeMonthly,
        (executionData.alimony as { lawsuitDate?: string } | undefined)?.lawsuitDate
    );

    const pastFromFields = Math.max(
        roundMoney(executionData.pastWifeAlimony),
        roundMoney(pastClaim?.amount),
        recomputed?.amount ?? 0
    );

    const hasCalcRows =
        roundMoney(calc?.totalAccumulated) > 0 ||
        roundMoney(calc?.baseAccumulation) > 0 ||
        roundMoney(calc?.pastAccumulation) > 0;

    if (hasCalcRows && calc) {
        const pastAccumulation = Math.max(
            roundMoney(calc.pastAccumulation),
            pastFromFields
        );
        const basePart = roundMoney(calc.baseAccumulation);
        const totalAccumulated = Math.max(
            roundMoney(calc.totalAccumulated),
            basePart + pastAccumulation,
            pastAccumulation
        );
        return {
            baseAccumulation: basePart,
            wifeBaseAccumulation: roundMoney(calc.wifeBaseAccumulation),
            childrenBaseAccumulation: roundMoney(calc.childrenBaseAccumulation),
            baseDurationDays: roundMoney(calc.baseDurationDays),
            baseDurationMonths: Number(calc.baseDurationMonths) || 0,
            pastAccumulation,
            pastWifeAccumulation: pastAccumulation,
            pastChildrenAccumulation: roundMoney(executionData.pastChildrenAlimony),
            pastDurationDays: Math.max(
                roundMoney(calc.pastDurationDays),
                roundMoney(pastClaim?.pastDurationDays),
                recomputed?.pastDurationDays ?? 0
            ),
            pastDurationMonths:
                Number(calc.pastDurationMonths) ||
                Number(pastClaim?.calculatedMonths) ||
                recomputed?.pastDurationMonths ||
                0,
            totalAccumulated,
        };
    }

    if (pastFromFields <= 0) return null;

    const pastMonths =
        Number(pastClaim?.calculatedMonths) || recomputed?.pastDurationMonths || 0;
    const pastDays =
        roundMoney(pastClaim?.pastDurationDays) ||
        recomputed?.pastDurationDays ||
        (pastMonths > 0 ? Math.round(pastMonths * 30) : 0);

    return {
        baseAccumulation: 0,
        wifeBaseAccumulation: 0,
        childrenBaseAccumulation: 0,
        baseDurationDays: 0,
        baseDurationMonths: 0,
        pastAccumulation: pastFromFields,
        pastWifeAccumulation: pastFromFields,
        pastChildrenAccumulation: roundMoney(executionData.pastChildrenAlimony),
        pastDurationDays: pastDays,
        pastDurationMonths: pastMonths,
        totalAccumulated: pastFromFields,
    };
}

/** أصل الدين لمسار النفقة — يشمل النفقة الماضية المنفصلة */
export function resolveAlimonyPrincipalAmount(
    executionData: ExecutionFile | null | undefined,
    parsedDebtAmount: number
): number {
    const breakdown = resolveAlimonyFinancialBreakdown(executionData);
    if (breakdown && breakdown.totalAccumulated > 0) {
        return breakdown.totalAccumulated;
    }
    return Math.max(0, parsedDebtAmount);
}
