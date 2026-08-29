import { useCallback } from 'react';
import { dispatchDecisionsReload, patchExecutorDecisionRowReliable } from '@/app/utils/executorSeizureDecisionQueue';

export function useSaveJudicialCustodianEntry(input: {
    decisionsStorageExecutionId: string | undefined;
    executionDataId: string | undefined;
    executionId: string | undefined;
    executorApprovalActions: {
        persistJudicialCustodianDetails: (payload: {
            decisionId: string;
            fullName: string;
            salary: string;
        }) => void;
    };
    showToast: (message: string, type?: string) => void;
}) {
    const {
        decisionsStorageExecutionId,
        executionDataId,
        executionId,
        executorApprovalActions,
        showToast,
    } = input;

    return useCallback(
        (payload: { decisionId: string; name: string; salary: string }) => {
            const did = String(payload.decisionId || '').trim();
            const fullName = String(payload.name || '').trim();
            const salary = String(payload.salary || '').trim();
            if (!did || !fullName || !salary) return;
            const storageId = String(
                decisionsStorageExecutionId || executionDataId || executionId || '',
            ).trim();
            const ts = new Date().toISOString();
            const { ok } = patchExecutorDecisionRowReliable(storageId, did, {
                judicialCustodianDetailsSavedAt: ts,
                judicialCustodianName: fullName,
                judicialCustodianSalary: salary,
            });
            if (!ok) {
                showToast('تعذر حفظ بيانات الحارس على القرار', 'error');
                return;
            }
            executorApprovalActions.persistJudicialCustodianDetails({
                decisionId: did,
                fullName,
                salary,
            });
            dispatchDecisionsReload();
            showToast('تم حفظ بيانات الحارس القاضي', 'success');
        },
        [
            decisionsStorageExecutionId,
            executionDataId,
            executionId,
            executorApprovalActions,
            showToast,
        ],
    );
}
