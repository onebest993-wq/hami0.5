// @ts-nocheck
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

/** تصنيف أحوال شخصية (قرارات المحاكم — شرعي) — لا يجوز تعدد المدينين */
export function isPersonalStatusClassification(classification: string): boolean {
    return String(classification || '').trim() === 'شرعي';
}

export function isDirectorateSectionComplete(directorate: string, fileNumber: string): boolean {
    return Boolean(String(directorate || '').trim() && String(fileNumber || '').trim());
}

export function isInstrumentSectionReadyForParties(input: {
    docType: string;
    classification: string;
    claimType: string;
    effectiveClaimTypes: string[];
    requiresClassification: boolean;
}): boolean {
    if (!String(input.docType || '').trim()) return false;
    if (
        input.requiresClassification &&
        (!String(input.classification || '').trim() || input.classification === 'none')
    ) {
        return false;
    }
    const types =
        input.effectiveClaimTypes.length > 0
            ? input.effectiveClaimTypes
            : input.claimType
              ? [input.claimType]
              : [];
    return types.length > 0;
}

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

/** إضبارة مركّبة: نفقة مستمرة + مطالبة مالية أخرى (ماضية، مهر، عدة، …) */
export function hasCompositeNonOngoingClaimTypes(
    executionData: Record<string, unknown> | null | undefined
): boolean {
    const types = getEffectiveClaimTypes(executionData);
    return types.some((t) => !ONGOING_ALIMONY_CLAIM_TYPES.has(t));
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

function resolveEffectiveClaimTypesList(
    effectiveClaimTypes: string[],
    claimType: string,
): string[] {
    return effectiveClaimTypes.length > 0
        ? effectiveClaimTypes
        : claimType
          ? [claimType]
          : [];
}

/** تقسيم مستقل/ضامن — مدني + مطالبة مالية قابلة للتقسيم فقط */
export function showCivilDebtorSolidarySplit(
    classification: string,
    effectiveClaimTypes: string[],
    claimType: string,
): boolean {
    if (String(classification || '').trim() !== 'مدني') return false;
    const types = resolveEffectiveClaimTypesList(effectiveClaimTypes, claimType);
    return types.some((ct) => isFinancialClaimForPartySplit(ct));
}

/** هل تُعرض حاوية حصة المدين المستقل في نموذج الإنشاء */
export function shouldShowIndependentDebtorSharePanels(
    classification: string,
    effectiveClaimTypes: string[],
    claimType: string,
    totalDebtorCount: number,
    totalCreditorCount: number,
): boolean {
    if (!showCivilDebtorSolidarySplit(classification, effectiveClaimTypes, claimType)) {
        return false;
    }
    if (totalDebtorCount < 1) return false;
    if (totalDebtorCount <= 1 && totalCreditorCount <= 1) return false;
    return true;
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

/** أقصى مبلغ يدوي لمدين مستقل — لا يتجاوز إجمالي الدين ولا مجموع المستقلين الآخرين */
export function maxManualIndependentDebtForSlot(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
): number {
    const total = Math.max(0, Math.round(globalClaimTotal));
    if (total <= 0 || debtorSolidaryFlags[slotIndex]) return 0;
    const otherIndependentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary || i === slotIndex) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    return Math.max(0, total - otherIndependentSum);
}

export function capManualIndependentDebtRaw(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
    raw: string,
): string {
    const cleaned = String(raw || '').replace(/,/g, '');
    if (cleaned === '') return '';
    const parsed = parseMoneyInput(cleaned);
    const max = maxManualIndependentDebtForSlot(
        globalClaimTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
    );
    if (parsed <= max) return cleaned;
    return String(max);
}

/** أقصى حصة أتعاب لمدين مستقل — لا تتجاوز إجمالي الأتعاب المحكوم بها */
export function maxManualIndependentLawyerFeesForSlot(
    globalLawyerFeesTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
): number {
    const total = Math.max(0, Math.round(globalLawyerFeesTotal));
    if (total <= 0 || debtorSolidaryFlags[slotIndex]) return 0;
    const otherIndependentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary || i === slotIndex) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    return Math.max(0, total - otherIndependentSum);
}

export function capManualIndependentLawyerFeesRaw(
    globalLawyerFeesTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
    raw: string,
): string {
    const cleaned = String(raw || '').replace(/,/g, '');
    if (cleaned === '') return '';
    const parsed = parseMoneyInput(cleaned);
    const max = maxManualIndependentLawyerFeesForSlot(
        globalLawyerFeesTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
    );
    if (parsed <= max) return cleaned;
    return String(max);
}

/** @deprecated */
export function maxManualSolidaryDebtForSlot(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
): number {
    return maxManualIndependentDebtForSlot(
        globalClaimTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
    );
}

/** @deprecated */
export function capManualSolidaryDebtRaw(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
    raw: string,
): string {
    return capManualIndependentDebtRaw(
        globalClaimTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
        raw,
    );
}

export function readPartyEntityKind(party: {
    entityKind?: string;
    entityType?: string;
    type?: string;
}): 'natural_person' | 'legal_entity' {
    const v =
        party.entityKind ??
        party.entityType ??
        (party.type === 'company' ? 'legal_entity' : 'natural_person');
    if (
        v === 'legal_entity' ||
        v === 'legal' ||
        v === 'company' ||
        v === 'معنوي' ||
        v === 'شخص معنوي'
    ) {
        return 'legal_entity';
    }
    return 'natural_person';
}

/** عند تعدد المدينين — لا يُmezج طبيعي مع معنوي */
export function resolveLockedDebtorEntityKind(
    debtors: Array<{ entityKind?: string; entityType?: string; type?: string }>,
    additionalDebtors: Array<{ entityKind?: string; entityType?: string; type?: string }>,
): 'natural_person' | 'legal_entity' | null {
    const all = [...debtors, ...additionalDebtors];
    if (all.length <= 1) return null;
    if (all.some((d) => readPartyEntityKind(d) === 'legal_entity')) {
        return 'legal_entity';
    }
    return 'natural_person';
}

export function canSetDebtorEntityKind(
    debtors: Array<{ id: number | string; entityKind?: string; entityType?: string; type?: string }>,
    additionalDebtors: Array<{ id: string; entityKind?: string; entityType?: string; type?: string }>,
    partyId: number | string,
    nextKind: 'natural_person' | 'legal_entity',
): boolean {
    const all = [...debtors, ...additionalDebtors];
    if (all.length <= 1) return true;
    for (const d of all) {
        if (String(d.id) === String(partyId)) continue;
        if (readPartyEntityKind(d) !== nextKind) return false;
    }
    return true;
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

/** حصة كل مدين: المتضامنون يحملون الذمة كاملة؛ غير المتضامنين يتقاسمون بالتساوي */
export function resolveDebtorAllocatedShares(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
): number[] {
    if (debtorSolidaryFlags.length === 0) return [];
    if (globalClaimTotal <= 0) return debtorSolidaryFlags.map(() => 0);
    const nonSolidaryCount = debtorSolidaryFlags.filter((f) => !f).length;
    const nonSolidaryShares =
        nonSolidaryCount > 0 ? splitAmountEqually(globalClaimTotal, nonSolidaryCount) : [];
    let nonSolidaryIdx = 0;
    return debtorSolidaryFlags.map((solidary) => {
        if (solidary) return globalClaimTotal;
        return nonSolidaryShares[nonSolidaryIdx++] ?? 0;
    });
}

/**
 * توزيع يدوي: المدين المستقل = مبلغ مُدخل؛ الضامنون = الباقي (ذمة متضامنة لكل منهم).
 * manualBySlot[i] — مبلغ الدين للمدين المستقل في الموضع i (يُتجاهل للضامن).
 */
export function resolveManualDebtorAllocatedShares(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
): { shares: number[]; independentSum: number; solidaryRemainder: number } {
    if (debtorSolidaryFlags.length === 0) {
        return { shares: [], independentSum: 0, solidaryRemainder: 0 };
    }
    const independentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    const solidaryRemainder = Math.max(0, Math.round(globalClaimTotal) - independentSum);
    const shares = debtorSolidaryFlags.map((solidary, i) => {
        if (solidary) return solidaryRemainder;
        return Math.max(0, Math.round(manualBySlot[i] ?? 0));
    });
    return { shares, independentSum, solidaryRemainder };
}

/** إجمالي الدين للعرض المالي — لا يُجمع ذمم الضامنين المكررة */
export function resolveExecutionPrincipalDebtTotal(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
): number {
    if (globalClaimTotal > 0) return Math.round(globalClaimTotal);
    const { independentSum, solidaryRemainder } = resolveManualDebtorAllocatedShares(
        0,
        debtorSolidaryFlags,
        manualBySlot,
    );
    return independentSum + (debtorSolidaryFlags.some(Boolean) ? solidaryRemainder : 0);
}
