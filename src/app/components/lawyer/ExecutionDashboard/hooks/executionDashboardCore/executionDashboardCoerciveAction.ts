/** حفظ إجراءات الحجز/الإكراه — chunk execution-hooks (منفصل عن core) */
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { promptSettlementSalaryConflictChoice } from '@/app/slices/financial/specialtyPublic';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    dispatchMovableSeizureInlineFocus,
    dispatchOpenSeizureCompletion,
    dispatchPropertySeizureInlineFocus,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';
import { saveNewCoerciveRequest } from './executionDashboardCoerciveActionNewRequest';
import { trySaveCompletedSeizureDetails } from './executionDashboardCoerciveActionSeizureSave';
import type { CoerciveActionDetails, SaveCoerciveActionDeps } from './executionDashboardCoerciveActionTypes';

export type { CoerciveSubjectRef, SaveCoerciveActionDeps } from './executionDashboardCoerciveActionTypes';

export function createSaveCoerciveAction(deps: SaveCoerciveActionDeps) {
    const saveCoerciveAction = (
        actionType: string,
        details: CoerciveActionDetails,
        opts?: { skipSettlementConflictCheck?: boolean },
    ) => {
        const {
            setShowCoerciveActionForm,
            settlementGuarantorGate,
            clearSettlementFromLedger,
            seizureDetailCompletion,
            executionData,
            executionId,
            decisionsStorageExecutionId,
            showToast,
        } = deps;

        const directDecisionRowId =
            (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
            /\S/.test(String(details.decisionRowId || '').trim())
                ? String(details.decisionRowId || '').trim()
                : '';

        if (
            actionType === 'salary' &&
            directDecisionRowId &&
            !seizureDetailCompletion &&
            !/\S/.test(String(details.employerName || '').trim()) &&
            !/\S/.test(String(details.salaryAmount || '').trim()) &&
            !/\S/.test(String(details.monthlyDeductionIqd || '').trim())
        ) {
            showToast('أكمل بيانات الحجز في النموذج قبل التسجيل.', 'warning');
            const dispatchId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionData: executionData as Record<string, unknown> | null,
            });
            if (dispatchId) dispatchOpenSeizureCompletion(dispatchId, directDecisionRowId);
            return;
        }

        if (
            actionType === 'property' &&
            directDecisionRowId &&
            !seizureDetailCompletion &&
            !/\S/.test(String(details.propertyNumber || '').trim()) &&
            !/\S/.test(String(details.propertyDistrict || '').trim()) &&
            !/\S/.test(String(details.propertyType || '').trim())
        ) {
            showToast('أكمل بيانات حجز العقار في النموذج قبل التسجيل.', 'warning');
            const dispatchId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionData: executionData as Record<string, unknown> | null,
            });
            if (dispatchId) dispatchPropertySeizureInlineFocus(dispatchId, directDecisionRowId);
            return;
        }

        if (
            actionType === 'vehicle' &&
            directDecisionRowId &&
            !seizureDetailCompletion &&
            !/\S/.test(String(details.movableDescription || '').trim()) &&
            !/\S/.test(String(details.movableLocation || '').trim())
        ) {
            showToast('أكمل بيانات حجز المال المنقول في النموذج قبل التسجيل.', 'warning');
            const dispatchId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionData: executionData as Record<string, unknown> | null,
            });
            if (dispatchId) dispatchMovableSeizureInlineFocus(dispatchId, directDecisionRowId);
            return;
        }

        setShowCoerciveActionForm(null);

        if (
            actionType === 'salary' &&
            directDecisionRowId &&
            !opts?.skipSettlementConflictCheck &&
            settlementGuarantorGate.pendingSettlement
        ) {
            void (async () => {
                const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
                if (choice === 'keep_settlement') {
                    showToast('تم الإبقاء على التسوية — أُلغي إكمال حجز الراتب.', 'info');
                    return;
                }
                clearSettlementFromLedger();
                saveCoerciveAction(actionType, details, { skipSettlementConflictCheck: true });
            })();
            return;
        }

        if (trySaveCompletedSeizureDetails(actionType, details, deps, directDecisionRowId)) {
            return;
        }

        saveNewCoerciveRequest(actionType, details, deps);
    };

    return saveCoerciveAction;
}
