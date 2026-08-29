import {
    isPastAlimonyOnlyClaim,
    resolveAlimonyPrincipalAmount,
} from '@/app/utils/alimonyFinancialBreakdown';
import { resolveMaritalFurnitureFinancialPrincipal } from '@/app/utils/maritalFurniture';
import {
    getEffectiveClaimTypes,
    hasOngoingAlimonyClaimTypes,
    isShariaLinkedFinancialClaim,
} from './executionFormClaimTypes';
import { parseMoneyInput, roundStoredMoney } from './executionFormMoney';
import { resolveEffectiveClaimTypesList } from './executionFormPartySplit';

export const MONETARY_CLAIM_AMOUNT_FIELD_VALUES = new Set([
    'استحصال دين مالي',
    'استخلاص دين مالي',
    'مهر مؤجل',
    'حجة زواج - مهر معجل',
    'حجة زواج - مهر مؤجل',
    'حجة وصية',
    'حجة تخارج',
    'حجة مخالعة',
    'حجة إقرار بدين',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'استيفاء دين من بيع عقار',
]);

export function claimUsesMonetaryAmountField(claimType: string): boolean {
    return MONETARY_CLAIM_AMOUNT_FIELD_VALUES.has(String(claimType || '').trim());
}

/** مطالبة تعرض حقل/حاسبة مبلغ في النموذج */
export type ExecutionClaimBreakdownRow = {
    claimType: string;
    label: string;
    amount: number;
};

const CLAIM_BREAKDOWN_LABELS: Record<string, string> = {
    نفقة: 'نفقة مستمرة',
    'نفقة ماضية': 'نفقة ماضية',
    'نفقة عدة': 'نفقة عدة',
    'مهر مؤجل': 'مهر مؤجل',
    'تعويض عن طلاق تعسفي': 'تعويض عن طلاق تعسفي',
};

/** بنود المطالبات المالية المحفوظة في الإضبارة (للسجل المالي) */
export function buildExecutionClaimBreakdown(
    executionData: Record<string, unknown> | null | undefined
): ExecutionClaimBreakdownRow[] {
    if (!executionData) return [];

    const types = getEffectiveClaimTypes(executionData);
    if (types.length === 0) return [];

    const amounts =
        executionData.claimAmountsByType && typeof executionData.claimAmountsByType === 'object'
            ? (executionData.claimAmountsByType as Record<string, unknown>)
            : {};
    const alimony = executionData.alimony as
        | {
              calculated?: {
                  totalAccumulated?: number;
                  baseAccumulation?: number;
              };
          }
        | undefined;
    const pastAlimony = executionData.pastAlimonyClaim as { amount?: number } | undefined;
    const hasSeparatePastClaim = types.includes('نفقة ماضية');

    const rows: ExecutionClaimBreakdownRow[] = [];
    for (const ct of types) {
        let amount = 0;
        if (ct === 'نفقة' || ct === 'حجة نفقة اتفاقية') {
            amount = hasSeparatePastClaim
                ? roundStoredMoney(alimony?.calculated?.baseAccumulation)
                : Math.max(
                      roundStoredMoney(alimony?.calculated?.totalAccumulated),
                      parseMoneyInput(String(amounts[ct] ?? ''))
                  );
        } else if (ct === 'نفقة ماضية') {
            amount = Math.max(
                roundStoredMoney(pastAlimony?.amount),
                parseMoneyInput(String(amounts[ct] ?? '')),
                roundStoredMoney(executionData.pastWifeAlimony)
            );
        } else if (ct === 'أثاث زوجية') {
            amount = resolveMaritalFurnitureFinancialPrincipal(executionData);
        } else {
            amount = parseMoneyInput(String(amounts[ct] ?? ''));
        }
        if (amount > 0) {
            rows.push({
                claimType: ct,
                label: CLAIM_BREAKDOWN_LABELS[ct] ?? ct,
                amount,
            });
        }
    }
    return rows;
}

export function claimHasFinancialAmountSection(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    if (!ct) return false;
    if (ct === 'نفقة' || ct === 'نفقة ماضية' || ct === 'حجة نفقة اتفاقية') return true;
    return claimUsesMonetaryAmountField(ct);
}

/**
 * أصل الدين في الوعاء الموحد:
 * - النفقة المستمرة: المتراكم فقط (baseAccumulation)
 * - النفقة الماضية / العدة / المهر / التعويض: ديون مقطوعة عادية
 */
export function resolveUnifiedVesselPrincipalAmount(
    executionData: Record<string, unknown> | null | undefined,
    parsedDebtAmount: number
): number {
    const parsed = Math.max(0, Math.round(parsedDebtAmount));
    if (!executionData) return parsed;

    const types = getEffectiveClaimTypes(executionData);
    if (types.length === 0) return parsed;

    const hasOngoing = hasOngoingAlimonyClaimTypes(types);
    const hasLumpSharia = types.some(
        (t) => t !== 'نفقة' && t !== 'حجة نفقة اتفاقية' && isShariaLinkedFinancialClaim(t)
    );
    const isMultiOrMixed = types.length > 1 || (hasOngoing && hasLumpSharia);

    if (isMultiOrMixed) {
        const breakdownSum = buildExecutionClaimBreakdown(executionData).reduce(
            (s, r) => s + r.amount,
            0
        );
        return Math.max(parsed, breakdownSum);
    }

    if (hasOngoing) {
        return resolveAlimonyPrincipalAmount(
            executionData as unknown as Parameters<typeof resolveAlimonyPrincipalAmount>[0],
            parsed
        );
    }

    if (isPastAlimonyOnlyClaim(types[0], types)) {
        return resolveAlimonyPrincipalAmount(
            executionData as unknown as Parameters<typeof resolveAlimonyPrincipalAmount>[0],
            parsed
        );
    }

    return parsed;
}

/** مبلغ مطالبة «نفقة ماضية» — من الحاسبة أو claimAmountsByType */
export function resolvePastAlimonyClaimAmount(
    claimAmountsByType: Record<string, string>,
    pastAccumulation?: number | null,
): number {
    return Math.max(
        0,
        Math.round(Number(pastAccumulation) || 0),
        parseMoneyInput(String(claimAmountsByType['نفقة ماضية'] ?? '')),
    );
}

/** رسالة توجيهية عند غياب مبلغ النفقة الماضية المحسوب */
export function findMissingPastAlimonyClaimFieldMessage(input: {
    alimonyPastStartDate: string;
    alimonyLawsuitDate: string;
    pastWifeMonthly: string;
    fallbackWifeMonthly?: string;
}): string {
    if (!String(input.alimonyPastStartDate || '').trim()) {
        return 'أدخل تاريخ استحقاق النفقة الماضية';
    }
    if (!String(input.alimonyLawsuitDate || '').trim()) {
        return 'أدخل تاريخ إقامة الدعوى لاحتساب النفقة الماضية';
    }
    const monthly =
        parseMoneyInput(input.pastWifeMonthly) ||
        parseMoneyInput(input.fallbackWifeMonthly ?? '');
    if (monthly <= 0) {
        return 'أدخل مقدار النفقة الشهرية للنفقة الماضية';
    }
    return 'أكمل بيانات احتساب النفقة الماضية — المبلغ المحسوب صفر';
}

export function findMissingRequiredMonetaryClaimAmount(
    effectiveClaimTypes: string[],
    claimType: string,
    claimAmountsByType: Record<string, string>,
    totalAmount: string,
    options?: {
        pastAlimonyAccumulation?: number | null;
    },
): string | null {
    const types = resolveEffectiveClaimTypesList(effectiveClaimTypes, claimType);
    for (const ct of types) {
        if (ct === 'نفقة ماضية') {
            if (resolvePastAlimonyClaimAmount(claimAmountsByType, options?.pastAlimonyAccumulation) <= 0) {
                return ct;
            }
            continue;
        }
        if (!claimUsesMonetaryAmountField(ct)) continue;
        const raw =
            claimAmountsByType[ct] ?? (types.length === 1 ? totalAmount : '');
        if (parseMoneyInput(raw) <= 0) return ct;
    }
    return null;
}
