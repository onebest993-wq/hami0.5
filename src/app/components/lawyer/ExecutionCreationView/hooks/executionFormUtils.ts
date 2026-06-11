import {
    isPastAlimonyOnlyClaim,
    resolveAlimonyPrincipalAmount,
} from '@/app/utils/alimonyFinancialBreakdown';
import { resolveMaritalFurnitureFinancialPrincipal } from '@/app/utils/maritalFurniture';

/** مطالبات أحوال شخصية يمكن الجمع بينها في إضبارة واحدة */
export const SHARIA_LINKED_FINANCIAL_CLAIM_VALUES = [
    'نفقة',
    'نفقة ماضية',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'مهر مؤجل',
] as const;

export type ShariaLinkedFinancialClaim = (typeof SHARIA_LINKED_FINANCIAL_CLAIM_VALUES)[number];

export function isShariaLinkedFinancialClaim(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    return (SHARIA_LINKED_FINANCIAL_CLAIM_VALUES as readonly string[]).includes(ct);
}

const ONGOING_ALIMONY_CLAIM_TYPES = new Set(['نفقة', 'حجة نفقة اتفاقية']);

/** أنواع المطالبة الفعّالة من الإضبارة (مصفوفة claimTypes أو claimType مفرد) */
export function getEffectiveClaimTypes(
    executionData: Record<string, unknown> | null | undefined
): string[] {
    if (!executionData) return [];
    const fromArray = Array.isArray(executionData.claimTypes)
        ? (executionData.claimTypes as string[]).map((t) => String(t || '').trim()).filter(Boolean)
        : [];
    if (fromArray.length > 0) return fromArray;
    const single = String(executionData.claimType || '').trim();
    return single ? [single] : [];
}

/** نفقة مستمرة/اتفاقية — مسار تراكم شهري منفصل عن الديون المقطوعة */
export function hasOngoingAlimonyClaimTypes(claimTypes: string[]): boolean {
    return claimTypes.some((t) => ONGOING_ALIMONY_CLAIM_TYPES.has(t));
}

export function hasOngoingAlimonyInExecution(
    executionData: Record<string, unknown> | null | undefined,
    fallbackClaimType?: string
): boolean {
    const types = getEffectiveClaimTypes(executionData);
    if (types.length > 0) return hasOngoingAlimonyClaimTypes(types);
    const ct = String(fallbackClaimType || '').trim();
    return (
        ONGOING_ALIMONY_CLAIM_TYPES.has(ct) ||
        (ct.includes('نفقة') &&
            !ct.includes('نفقة عدة') &&
            !ct.includes('نفقة ماضية') &&
            !ct.includes('مهر'))
    );
}

function roundStoredMoney(n: unknown): number {
    const v = Math.round(Number(n) || 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
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
            executionData as Parameters<typeof resolveAlimonyPrincipalAmount>[0],
            parsed
        );
    }

    if (isPastAlimonyOnlyClaim(types[0], types)) {
        return resolveAlimonyPrincipalAmount(
            executionData as Parameters<typeof resolveAlimonyPrincipalAmount>[0],
            parsed
        );
    }

    return parsed;
}

export const FINANCIAL_CLAIM_TYPES_PARTY_SPLIT = new Set([
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
    'نفقة',
    'نفقة ماضية',
    'حجة نفقة اتفاقية',
]);

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
    'نفقة ماضية',
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

export function isFinancialClaimForPartySplit(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    return Boolean(ct && FINANCIAL_CLAIM_TYPES_PARTY_SPLIT.has(ct));
}

export function parseMoneyInput(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw || '')).replace(/\u066B/g, '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    return Math.max(0, Math.round(parseFloat(cleaned) || 0));
}

export function splitAmountEqually(total: number, parts: number): number[] {
    if (parts <= 0) return [];
    const t = Math.max(0, Math.round(total));
    if (t === 0) return Array(parts).fill(0);
    const base = Math.floor(t / parts);
    let rem = t - base * parts;
    const out = Array(parts).fill(base);
    for (let i = 0; i < rem; i++) out[i] += 1;
    return out;
}
