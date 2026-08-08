// @ts-nocheck
/** Phase C Slice 16 — فتح إكمال جرد الأثاث / الحارس القضائي من قرارات المنفذ المعلّقة */
import { useCallback } from 'react';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';
import {
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
} from '@/app/utils/executorDecisionReadQueries';

export type UseExecutionDashboardPendingExecutorDecisionOpenersParams = {
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    executionData?: Record<string, unknown> | null;
    executorApprovalActions: ExecutorApprovalActions;
    setShowDecisionsModal: (show: boolean) => void;
    openBreakInventoryCompletion: (
        decisionId: string,
        actions: ExecutorApprovalActions,
        requestTitle: string,
    ) => void;
    openJudicialCustodianCompletion: (
        decisionId: string,
        actions: ExecutorApprovalActions,
        requestTitle: string,
    ) => void;
};

export function useExecutionDashboardPendingExecutorDecisionOpeners(
    params: UseExecutionDashboardPendingExecutorDecisionOpenersParams,
) {
    const {
        executionId,
        decisionsStorageExecutionId,
        executionData = null,
        executorApprovalActions,
        setShowDecisionsModal,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
    } = params;

    const tryOpenPendingBreakInventoryLedger = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedBreakInventoryNeedingLedger(primaryKey, executionData);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedBreakInventoryNeedingLedger(altKey, executionData)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openBreakInventoryCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionId,
        decisionsStorageExecutionId,
        executionData,
        executorApprovalActions,
        openBreakInventoryCompletion,
        setShowDecisionsModal,
    ]);

    const tryOpenPendingCustodianDetails = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedCustodianNeedingDetails(primaryKey, executionData);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedCustodianNeedingDetails(altKey, executionData)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openJudicialCustodianCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionId,
        decisionsStorageExecutionId,
        executionData,
        executorApprovalActions,
        openJudicialCustodianCompletion,
        setShowDecisionsModal,
    ]);

    return {
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
    };
}
