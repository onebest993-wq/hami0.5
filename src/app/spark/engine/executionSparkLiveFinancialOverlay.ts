import type { ExecutionSparkFinancialOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import type { PendingSettlement } from '@/app/components/lawyer/FinancialOperationsCenter/types';

type SettlementGuarantorGateSlice = {
    pendingSettlement?: PendingSettlement | null;
    settlementBreachTriggeredAt?: string | null;
};

/** يبني overlay مالي لحظي من scope لوحة التنفيذ — أدق من قراءة التخزين وحدها */
export function buildExecutionSparkFinancialOverlay(input: {
    remainingBalanceForSeizure?: unknown;
    settlementGuarantorGate?: unknown;
}): ExecutionSparkFinancialOverlay | undefined {
    const gate = input.settlementGuarantorGate as SettlementGuarantorGateSlice | null | undefined;
    const remainingRaw = Number(input.remainingBalanceForSeizure);
    const hasRemaining = Number.isFinite(remainingRaw);
    const hasGate =
        Boolean(gate?.pendingSettlement) || Boolean(String(gate?.settlementBreachTriggeredAt ?? '').trim());

    if (!hasRemaining && !hasGate) return undefined;

    return {
        ledgerRemainingIqd: hasRemaining ? Math.max(0, Math.round(remainingRaw)) : undefined,
        pendingSettlement: gate?.pendingSettlement ?? null,
        settlementBreachTriggeredAt: gate?.settlementBreachTriggeredAt ?? null,
    };
}
