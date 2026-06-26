import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { storageCache } from '@/app/utils/storageCache';
import {
    resolveRemainingBalanceFromFinancialCenter,
    resolveSettlementGuarantorGateFromLedger,
    resolveUnifiedLedgerFinancialTotals,
    type UnifiedLedgerTotalParams,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { syncSoldMovableProceedsToTrustLedger } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import { syncSoldPropertyProceedsToTrustLedger } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils';

export type UseExecutionDashboardLedgerSyncParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    seizureMatrixLedgerParams: UnifiedLedgerTotalParams;
    unifiedLedgerRevision: number;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
};

/** مزامنة عائدات الحجز + أرصدة المحضر المالي — chunk execution-hooks */
export function useExecutionDashboardLedgerSync({
    executionData,
    executionId,
    decisionsStorageExecutionId,
    seizureMatrixLedgerParams,
    unifiedLedgerRevision,
    setUnifiedLedgerRevision,
}: UseExecutionDashboardLedgerSyncParams) {
    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const movables = (executionData?.seizedMovables || []) as SeizedMovable[];
        if (!Array.isArray(movables) || movables.length === 0) return;
        const totals = resolveUnifiedLedgerFinancialTotals(myId, seizureMatrixLedgerParams, (k) =>
            storageCache.get(k),
        );
        const results = syncSoldMovableProceedsToTrustLedger(myId, movables, {
            totalOwedIqd: totals.totalOwedUnified,
            ledgerParams: seizureMatrixLedgerParams,
        });
        if (results.some((r) => r.created || r.updated)) {
            setUnifiedLedgerRevision((v) => v + 1);
        }
    }, [executionData?.id, executionId, executionData?.seizedMovables, seizureMatrixLedgerParams, setUnifiedLedgerRevision]);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const properties = (executionData?.seizedProperties || []) as SeizedProperty[];
        if (!Array.isArray(properties) || properties.length === 0) return;
        const totals = resolveUnifiedLedgerFinancialTotals(myId, seizureMatrixLedgerParams, (k) =>
            storageCache.get(k),
        );
        const results = syncSoldPropertyProceedsToTrustLedger(myId, properties, {
            totalOwedIqd: totals.totalOwedUnified,
            ledgerParams: seizureMatrixLedgerParams,
        });
        if (results.some((r) => r.created || r.updated)) {
            setUnifiedLedgerRevision((v) => v + 1);
        }
    }, [executionData?.id, executionId, executionData?.seizedProperties, seizureMatrixLedgerParams, setUnifiedLedgerRevision]);

    const remainingBalanceForSeizure = useMemo(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined;
        return resolveRemainingBalanceFromFinancialCenter({
            executionId: exId,
            ledgerParams: seizureMatrixLedgerParams,
            readRaw: (key) => storageCache.get(key),
        });
    }, [
        decisionsStorageExecutionId,
        executionId,
        seizureMatrixLedgerParams,
        unifiedLedgerRevision,
    ]);

    const settlementGuarantorGate = useMemo(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined;
        return resolveSettlementGuarantorGateFromLedger({
            executionId: exId,
            readRaw: (key) => storageCache.get(key),
        });
    }, [decisionsStorageExecutionId, executionId, unifiedLedgerRevision]);

    return { remainingBalanceForSeizure, settlementGuarantorGate };
}
