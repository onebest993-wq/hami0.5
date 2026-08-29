/** Phase C Slice 16 — أعلام قفل الإجراءات الجبرية + مشتقات واجهة الإضبارة */
import { useMemo } from 'react';
import { buildExecutionCoerciveUiFlags } from './executionDashboardCoerciveUi';

export type UseExecutionDashboardCoerciveUiStateParams = {
    executionPaused: boolean;
    isPaused: boolean;
    stayOfExecutionActive: boolean;
    activeDebtorSolidary: boolean;
    allDebtorsUnifiedLength: number;
    activeDebtorCleared: boolean;
    dossierStatus: string | null | undefined;
    isHistoricalMode: boolean;
};

export type ExecutionDashboardCoerciveUiState = {
    coerciveUiLocked: boolean;
    dividedActiveDebtorCleared: boolean;
    executionCoerciveButtonDisabled: boolean;
    dossierStatusUi: string;
    coerciveDossierLocked: boolean;
    executionActionsGridLocked: boolean;
    executionToolsTimelineLockedUi: boolean;
    evictionProcedureLocked: boolean;
};

export function useExecutionDashboardCoerciveUiState(
    params: UseExecutionDashboardCoerciveUiStateParams,
): ExecutionDashboardCoerciveUiState {
    const {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
    } = useMemo(
        () =>
            buildExecutionCoerciveUiFlags({
                executionPaused: params.executionPaused,
                isPaused: params.isPaused,
                stayOfExecutionActive: params.stayOfExecutionActive,
                activeDebtorSolidary: params.activeDebtorSolidary,
                allDebtorsUnifiedLength: params.allDebtorsUnifiedLength,
                activeDebtorCleared: params.activeDebtorCleared,
                dossierStatus: params.dossierStatus,
            }),
        [
            params.executionPaused,
            params.isPaused,
            params.stayOfExecutionActive,
            params.activeDebtorSolidary,
            params.allDebtorsUnifiedLength,
            params.activeDebtorCleared,
            params.dossierStatus,
        ],
    );

    const executionActionsGridLocked = params.stayOfExecutionActive;
    const executionToolsTimelineLockedUi =
        executionActionsGridLocked || params.isHistoricalMode;
    const evictionProcedureLocked = coerciveUiLocked;

    return {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        evictionProcedureLocked,
    };
}
