// @ts-nocheck
/** Phase C Slice 16 — فتح إكمال جرد الأثاث / الحارس القضائي من قرارات المنفذ المعلّقة */
import { useCallback } from 'react';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';
import {
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
} from '@/app/utils/executorSeizureDecisionQueue';

export type UseExecutionDashboardPendingExecutorDecisionOpenersParams = {
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
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
        executorApprovalActions,
        setShowDecisionsModal,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
    } = params;

    const tryOpenPendingBreakInventoryLedger = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedBreakInventoryNeedingLedger(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedBreakInventoryNeedingLedger(altKey)
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
        executorApprovalActions,
        openBreakInventoryCompletion,
        setShowDecisionsModal,
    ]);

    const tryOpenPendingCustodianDetails = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedCustodianNeedingDetails(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedCustodianNeedingDetails(altKey)
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
        executorApprovalActions,
        openJudicialCustodianCompletion,
        setShowDecisionsModal,
    ]);

    return {
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
    };
}
