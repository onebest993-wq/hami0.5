import {
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

/** هل الصف الحاكم يحتاج نموذج إكمال بعد موافقة المنفذ (داخل المحضر)؟ */
export function branchRowNeedsPostApprovalInlineWork(
    branch: string,
    row: Record<string, unknown>,
    list: Record<string, unknown>[]
): boolean {
    if (!isEvictionProcedureRowActive(row, list)) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isEvictionProcedureRowPending(row)) return false;
    if (!isExecutorRowEffectivelyApproved(row)) return false;
    if (!isExecutorRowApprovedWorkflowActive(row, list)) return false;

    if (branch === 'Field Visit Date') {
        return !String((row as { executorScheduleLabel?: string }).executorScheduleLabel || '').trim();
    }
    if (branch === 'Police Assistance Request') {
        return !String((row as { policeAssistanceSavedAt?: string }).policeAssistanceSavedAt || '').trim();
    }
    if (branch === 'Lock Breaking & Inventory') {
        return !String(
            (row as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt || ''
        ).trim();
    }
    if (branch === 'Judicial Custodian') {
        return !String(
            (row as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt || ''
        ).trim();
    }
    return !isEvictionProcedureRowWorkflowComplete(row);
}
