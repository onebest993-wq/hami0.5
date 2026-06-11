import { splitAmountEqually } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import type { AdditionalExecutionCreditor, Creditor, PartyMultiplicityExtension } from '@/app/types/execution';

export interface CreditorDebtRow {
    creditorId: string;
    creditorName: string;
    isClient: boolean;
    isAdditional: boolean;
    allocatedDebt: number;
    paidAmount: number;
    remainingDebt: number;
}

export interface CreditorPaymentAllocation {
    creditorId: string;
    creditorName: string;
    isClient: boolean;
    isAdditional: boolean;
    amount: number;
}

export interface DistributePaymentResult {
    ok: boolean;
    note?: string;
    allocations: CreditorPaymentAllocation[];
    clientCreditorTotal: number;
    nonClientTotal: number;
}

function parseMoney(raw: unknown): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.trunc(raw));
    const s = String(raw ?? '').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function resolveCreditorName(c: Record<string, unknown>): string {
    const n = String(c.fullName ?? c.name ?? '').trim();
    return n || 'دائن';
}

/** يبني مصفوفة الدائنين (أساسي + إضافي) مع الديون المتبقية لكل منهم */
export function buildCreditorDebtRows(file: Record<string, unknown> | null | undefined): CreditorDebtRow[] {
    if (!file || typeof file !== 'object') return [];

    const creditors = Array.isArray(file.creditors) ? (file.creditors as Creditor[]) : [];
    const pm = file.party_multiplicity as PartyMultiplicityExtension | undefined;
    const additional = Array.isArray(pm?.additionalCreditors) ? pm!.additionalCreditors : [];

    const totalAmount = parseMoney(
        file.totalAmount ?? file.debtAmount ?? (file as Record<string, unknown>).total_remaining_balance
    );

    const rows: CreditorDebtRow[] = [];

    creditors.forEach((c, i) => {
        const allocated = parseMoney(c.allocated_debt);
        const paid = parseMoney(c.paid_amount);
        rows.push({
            creditorId: String(c.id ?? `ec-${i}`),
            creditorName: resolveCreditorName(c as unknown as Record<string, unknown>),
            isClient: Boolean(c.isClient),
            isAdditional: false,
            allocatedDebt: allocated,
            paidAmount: paid,
            remainingDebt: Math.max(0, allocated - paid),
        });
    });

    additional.forEach((ac: AdditionalExecutionCreditor) => {
        const allocated = parseMoney(ac.allocated_debt);
        const paid = parseMoney(ac.paid_amount);
        rows.push({
            creditorId: String(ac.id),
            creditorName: resolveCreditorName(ac as unknown as Record<string, unknown>),
            isClient: Boolean(ac.isClient),
            isAdditional: true,
            allocatedDebt: allocated,
            paidAmount: paid,
            remainingDebt: Math.max(0, allocated - paid),
        });
    });

    const allocSum = rows.reduce((s, r) => s + r.allocatedDebt, 0);
    if (allocSum <= 0 && totalAmount > 0 && rows.length > 0) {
        const shares = splitAmountEqually(totalAmount, rows.length);
        rows.forEach((r, i) => {
            r.allocatedDebt = shares[i] ?? 0;
            r.remainingDebt = Math.max(0, r.allocatedDebt - r.paidAmount);
        });
    } else {
        rows.forEach((r) => {
            r.remainingDebt = Math.max(0, r.allocatedDebt - r.paidAmount);
        });
    }

    return rows;
}

/** يوزّع مبلغ الدفعة على الدائنين بنسبة وتناسب (Pro-rata) */
export interface GhuramaaCreditorRow {
    creditorId: string;
    creditorName: string;
    debtBeforeDistribution: number;
    remainingDebt: number;
}

/** صفوف قسمة الغرماء — نفس حصص الدائنين المستخدمة في التسديد التناسبي */
export function buildGhuramaaCreditorRows(
    file: Record<string, unknown> | null | undefined,
    claimTotalFallback?: number
): GhuramaaCreditorRow[] {
    const enriched =
        file && typeof file === 'object'
            ? {
                  ...file,
                  totalAmount:
                      parseMoney(file.totalAmount ?? file.debtAmount) > 0
                          ? parseMoney(file.totalAmount ?? file.debtAmount)
                          : Math.max(0, Math.trunc(claimTotalFallback ?? 0)),
              }
            : file;
    return buildCreditorDebtRows(enriched).map((r) => ({
        creditorId: r.creditorId,
        creditorName: r.creditorName,
        debtBeforeDistribution: r.allocatedDebt,
        remainingDebt: r.remainingDebt,
    }));
}

export function distributePaymentProRata(
    paymentAmount: number,
    rows: CreditorDebtRow[]
): DistributePaymentResult {
    const pay = Math.max(0, Math.trunc(paymentAmount));
    if (pay <= 0) {
        return { ok: false, note: 'مبلغ الدفعة غير صالح.', allocations: [], clientCreditorTotal: 0, nonClientTotal: 0 };
    }
    if (rows.length === 0) {
        return { ok: false, note: 'لا يوجد دائنون.', allocations: [], clientCreditorTotal: 0, nonClientTotal: 0 };
    }

    if (rows.length === 1) {
        const r = rows[0];
        const alloc: CreditorPaymentAllocation = {
            creditorId: r.creditorId,
            creditorName: r.creditorName,
            isClient: r.isClient,
            isAdditional: r.isAdditional,
            amount: pay,
        };
        return {
            ok: true,
            allocations: [alloc],
            clientCreditorTotal: r.isClient ? pay : 0,
            nonClientTotal: r.isClient ? 0 : pay,
        };
    }

    const weights = rows.map((r) => {
        const w = r.remainingDebt > 0 ? r.remainingDebt : r.allocatedDebt > 0 ? r.allocatedDebt : 1;
        return { ...r, weight: Math.max(0, Math.trunc(w)) };
    });
    const totalWeight = weights.reduce((s, r) => s + r.weight, 0);
    if (totalWeight <= 0) {
        return { ok: false, note: 'لا توجد حصص دين قابلة للتوزيع.', allocations: [], clientCreditorTotal: 0, nonClientTotal: 0 };
    }

    const denom = BigInt(totalWeight);
    const base = weights.map((r) => {
        const num = BigInt(pay) * BigInt(r.weight);
        const floor = Number(num / denom);
        const rem = num % denom;
        return { ...r, floor, rem };
    });
    const baseSum = base.reduce((s, r) => s + r.floor, 0);
    let remainder = Math.max(0, pay - baseSum);
    const sorted = [...base].sort((a, b) => (a.rem === b.rem ? 0 : a.rem > b.rem ? -1 : 1));
    const topUp: Record<string, number> = {};
    for (let i = 0; i < sorted.length && remainder > 0; i += 1) {
        const id = sorted[i].creditorId;
        topUp[id] = (topUp[id] || 0) + 1;
        remainder -= 1;
        if (i === sorted.length - 1 && remainder > 0) i = -1;
    }

    const allocations: CreditorPaymentAllocation[] = base.map((r) => ({
        creditorId: r.creditorId,
        creditorName: r.creditorName,
        isClient: r.isClient,
        isAdditional: r.isAdditional,
        amount: r.floor + (topUp[r.creditorId] || 0),
    }));

    let clientCreditorTotal = 0;
    let nonClientTotal = 0;
    for (const a of allocations) {
        if (a.isClient) clientCreditorTotal += a.amount;
        else nonClientTotal += a.amount;
    }

    const sumCheck = allocations.reduce((s, a) => s + a.amount, 0);
    return {
        ok: sumCheck === pay,
        note: sumCheck !== pay ? 'تنبيه: فرق تقريب في التوزيع.' : undefined,
        allocations,
        clientCreditorTotal,
        nonClientTotal,
    };
}
