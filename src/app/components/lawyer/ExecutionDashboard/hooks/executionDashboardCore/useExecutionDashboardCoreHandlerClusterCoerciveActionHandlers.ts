import { useExecutionDashboardCoerciveActionHandlers } from './useExecutionDashboardCoerciveActionHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterCoerciveActionHandlers(
    c: ExecutionDashboardCoreHandlerClusterInput,
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void,
) {
    const resolved = c as any;
    const {
        coerciveUiLocked,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        decisionsStorageExecutionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        coerciveSubjectRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        showToast,
    } = resolved;

    return useExecutionDashboardCoerciveActionHandlers({
        coerciveUiLocked,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        decisionsStorageExecutionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        coerciveSubjectRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        showToast,
        saveCoerciveAction,
    });
}
