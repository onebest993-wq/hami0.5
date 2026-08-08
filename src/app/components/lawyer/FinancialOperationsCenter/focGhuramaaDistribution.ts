import { splitAmountEqually } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { formatIqdDisplay, parseAmount } from './utils';

export interface GhuramaaCreditorInput {
    creditorId?: string;
    creditorName?: string;
    debtBeforeDistribution?: number;
    remainingDebt?: number;
}

export interface GhuramaaEligibleCreditor {
    creditorId: string;
    creditorName: string;
    debtBeforeDistribution: number;
    remainingDebt: number;
}

export interface GhuramaaContext {
    canOpen: boolean;
    available: number;
    totalDebt: number;
    eligible: GhuramaaEligibleCreditor[];
    note: string | null;
}

export interface GhuramaaDistributionRow {
    creditorId: string;
    creditorName: string;
    debtBeforeDistribution: number;
    amountDistributed: number;
}

export interface GhuramaaManualResult {
    ok: boolean;
    sum: number;
    remainingAfter: number;
    rows: GhuramaaDistributionRow[];
    validationNote: string | null;
    partialWarning: string | null;
    isEqualMode: boolean;
}

export function buildGhuramaaContext(
    creditors: GhuramaaCreditorInput[] | undefined,
    trustBalanceUnified: number,
): GhuramaaContext {
    const list = Array.isArray(creditors) ? creditors : [];
    const available = Math.max(0, Math.trunc(trustBalanceUnified));
    const eligible = list
        .map((c) => ({
            creditorId: String(c.creditorId || '').trim(),
            creditorName: String(c.creditorName || '').trim() || 'دائن',
            debtBeforeDistribution: Math.max(0, Math.trunc(c.debtBeforeDistribution ?? 0)),
            remainingDebt: Math.max(0, Math.trunc(c.remainingDebt ?? 0)),
        }))
        .filter((c) => c.creditorId);
    const totalDebt = eligible.reduce((s, c) => s + c.remainingDebt, 0);
    const canOpen = available > 0 && eligible.length > 0;
    const note =
        available <= 0
            ? 'رصيد الأمانات = 0.'
            : eligible.length === 0
              ? 'لا يوجد دائنون مؤهلون للتوزيع.'
              : null;
    return { canOpen, available, totalDebt, eligible, note };
}

export function computeGhuramaaManualDistribution(params: {
    context: GhuramaaContext;
    shareInputs: Record<string, string>;
    splitMode: 'manual' | 'equal' | null;
}): GhuramaaManualResult {
    const { context, shareInputs, splitMode } = params;
    const { available, eligible } = context;
    const isEqualMode = splitMode === 'equal';
    const rows: GhuramaaDistributionRow[] = [];
    let sum = 0;
    let hasInvalidField = false;
    let validationNote: string | null = null;
    let partialWarning: string | null = null;

    for (const c of eligible) {
        const raw = String(shareInputs[c.creditorId] ?? '').trim();
        const parsed = raw ? parseAmount(raw) : 0;
        if (raw && (!Number.isFinite(parsed) || parsed < 0)) {
            hasInvalidField = true;
            validationNote = 'أدخل مبالغاً صحيحة لحصص الدائنين.';
        }
        const amount = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
        if (amount > available) {
            hasInvalidField = true;
            validationNote = 'حصة دائن تتجاوز رصيد الأمانات المتاح.';
        }
        if (!isEqualMode && amount > c.remainingDebt) {
            hasInvalidField = true;
            validationNote = 'حصة دائن تتجاوز دينه المتبقي.';
        }
        sum += amount;
        rows.push({
            creditorId: c.creditorId,
            creditorName: c.creditorName,
            debtBeforeDistribution: c.remainingDebt,
            amountDistributed: amount,
        });
    }

    if (sum > available) {
        hasInvalidField = true;
        validationNote = 'مجموع الحصص يتجاوز رصيد الأمانات المتاح.';
    }

    const remainingAfter = Math.max(0, available - sum);
    if (!isEqualMode && sum > 0 && remainingAfter > 0) {
        partialWarning = `يوجد متبقٍ في الأمانات (${remainingAfter.toLocaleString('ar-IQ')} د.ع) — يمكنك الاستمرار أو تعديل الحصص.`;
    }
    if (isEqualMode && sum > 0 && remainingAfter > 0) {
        hasInvalidField = true;
        validationNote = 'التقسيم بالتساوي يجب أن يوزّع رصيد الأمانات بالكامل دون متبقٍ.';
    }

    const ok =
        context.canOpen && !hasInvalidField && sum > 0 && (isEqualMode ? remainingAfter === 0 : true);

    return {
        ok,
        sum,
        remainingAfter,
        rows,
        validationNote,
        partialWarning,
        isEqualMode,
    };
}

export function buildGhuramaaEqualSplitInputs(
    eligible: GhuramaaEligibleCreditor[],
    available: number,
): Record<string, string> {
    if (available <= 0 || eligible.length === 0) return {};
    const shares = splitAmountEqually(available, eligible.length);
    const next: Record<string, string> = {};
    eligible.forEach((c, i) => {
        const amt = shares[i] ?? 0;
        next[c.creditorId] = amt > 0 ? formatIqdDisplay(amt) : '';
    });
    return next;
}
