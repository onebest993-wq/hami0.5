import type { LooseArchiveFile } from './types';

export function parseLooseAmount(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export function executionTotalDemandEstimate(file: LooseArchiveFile): number {
    const f = file as unknown as Record<string, unknown>;
    const principal = parseLooseAmount(f.totalAmount ?? f.amount ?? f.debtAmount);
    const lawyer = parseLooseAmount(f.lawyerFeesAmount);
    const court = parseLooseAmount(f.courtFees);
    const dir = parseLooseAmount(f.directorateFees);
    const evx = Array.isArray(f.eviction_case_expenses)
        ? (f.eviction_case_expenses as { amount?: unknown }[]).reduce(
              (s, x) => s + parseLooseAmount(x?.amount),
              0,
          )
        : 0;
    return principal + lawyer + court + dir + evx;
}

/** متبقي مخزَّن على صف الفهرس — بلا دفتر حي. null = الحقل غائب (ليس صفراً). */
export function executionIndexRemainingHint(file: LooseArchiveFile): number | null {
    const f = file as unknown as Record<string, unknown>;
    const raw =
        f.total_remaining_balance !== undefined &&
        f.total_remaining_balance !== null &&
        f.total_remaining_balance !== ''
            ? f.total_remaining_balance
            : f.remainingDebt !== undefined && f.remainingDebt !== null && f.remainingDebt !== ''
              ? f.remainingDebt
              : undefined;
    if (raw === undefined) return null;
    return parseLooseAmount(raw);
}

export function resolveExecutionArchiveListDemand(
    file: LooseArchiveFile,
    unifiedMeta?: { unifiedCount?: number; unifiedTotalDemand?: number },
): {
    totalDemand: number;
    remainingDemand: number;
    demandLabel: string;
    secondaryDemandLabel: string | null;
    syncedFromLedger: boolean;
} {
    const unifiedCount = Number(unifiedMeta?.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number(unifiedMeta?.unifiedTotalDemand);
    if (unifiedCount > 0 && Number.isFinite(unifiedTotalDemandRaw) && unifiedTotalDemandRaw > 0) {
        return {
            totalDemand: unifiedTotalDemandRaw,
            remainingDemand: unifiedTotalDemandRaw,
            demandLabel: 'إجمالي المطلوب (بعد التوحيد)',
            secondaryDemandLabel: null,
            syncedFromLedger: true,
        };
    }

    const totalDemand = executionTotalDemandEstimate(file);
    const remainingHint = executionIndexRemainingHint(file);
    if (remainingHint != null) {
        const remainingDemand = Math.max(0, remainingHint);
        const paidDown = totalDemand > 0 && remainingDemand < totalDemand;
        return {
            totalDemand,
            remainingDemand,
            demandLabel: paidDown || remainingDemand === 0 ? 'متبقي الوعاء' : 'إجمالي المطلوب (تقدير)',
            secondaryDemandLabel:
                paidDown || remainingDemand === 0
                    ? `الإجمالي: ${Math.round(totalDemand).toLocaleString('ar-IQ')} د.ع`
                    : null,
            syncedFromLedger: false,
        };
    }
    return {
        totalDemand,
        remainingDemand: totalDemand,
        demandLabel: 'إجمالي المطلوب (تقدير)',
        secondaryDemandLabel: null,
        syncedFromLedger: false,
    };
}
