import { useMemo } from 'react';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { useExecutionDashboardLedgerSync } from './useExecutionDashboardLedgerSync';
import { resolveIsPersonalStatusExecutionClaim } from './executionDashboardClaimFinancials';
import type { ExecutionDashboardCoreClaimFinancialLedgerPipelineInput } from './useExecutionDashboardCoreClaimFinancialLedgerPipelineImpl';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';

export function useClaimFinancialLedgerSeizureTail(input: {
    p: ExecutionDashboardCoreClaimFinancialLedgerPipelineInput;
    heavyComputeReady: boolean;
    seizureMatrixLedgerParams: UnifiedLedgerTotalParams | null;
    unifiedLedgerRevision: number;
    setUnifiedLedgerRevision: (updater: (v: number) => number) => void;
}) {
    const { p, heavyComputeReady, seizureMatrixLedgerParams, unifiedLedgerRevision, setUnifiedLedgerRevision } =
        input;

    const ledgerSync = useExecutionDashboardLedgerSync({
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        seizureMatrixLedgerParams,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
    });

    const { remainingBalanceForSeizure, settlementGuarantorGate } = ledgerSync;

    const activeFollowupDebtorForSeizureMatrix = useMemo(() => {
        if (p.debtorBrowserTabsMode && p.activeWorkspaceDebtorForFollowup) {
            return p.activeWorkspaceDebtorForFollowup.d;
        }
        return p.executionData?.debtors?.[0];
    }, [p.debtorBrowserTabsMode, p.activeWorkspaceDebtorForFollowup, p.executionData?.debtors]);

    const seizureMatrix = useMemo(
        () =>
            resolveSeizureMatrixFromExecution({
                remainingBalanceIqd: remainingBalanceForSeizure,
                executionData: heavyComputeReady ? (p.viewExecutionData ?? p.executionData) : null,
                activeDebtor: heavyComputeReady ? activeFollowupDebtorForSeizureMatrix : undefined,
                activeDebtorIsEmployee: heavyComputeReady ? p.activeDebtorIsEmployee : false,
            }),
        [
            heavyComputeReady,
            remainingBalanceForSeizure,
            p.viewExecutionData,
            p.executionData,
            activeFollowupDebtorForSeizureMatrix,
            p.activeDebtorIsEmployee,
        ],
    );
    p.seizureMatrixRef.current = seizureMatrix;

    const isPersonalStatusExecutionClaim = useMemo(
        () =>
            resolveIsPersonalStatusExecutionClaim({
                claimType: p.claimType,
                executionData: p.executionData,
                docType: p.docType,
                classification: p.classification,
                activeDebtorEntityKind: p.activeDebtorEntityKind ?? undefined,
            }),
        [p.claimType, p.classification, p.docType, p.executionData, p.activeDebtorEntityKind],
    );

    return {
        ledgerSync,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isPersonalStatusExecutionClaim,
    };
}
