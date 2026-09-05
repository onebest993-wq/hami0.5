/** حفظ إجراءات الحجز/الإكراه — chunk execution-hooks (منفصل عن core) */
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { promptSettlementSalaryConflictChoice } from '@/app/slices/financial/specialtyPublic';
import { saveNewCoerciveRequest } from './executionDashboardCoerciveActionNewRequest';
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
            showToast,
        } = deps;

        const directDecisionRowId =
            (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
            /\S/.test(String(details.decisionRowId || '').trim())
                ? String(details.decisionRowId || '').trim()
                : '';

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
                    showToast('تم الإبقاء على التسوية — أُلغي طلب حجز الراتب.', 'info');
                    return;
                }
                clearSettlementFromLedger();
                saveCoerciveAction(actionType, details, { skipSettlementConflictCheck: true });
            })();
            return;
        }

        // مسار إكمال تفاصيل الحجز بعد الموافقة أُزيل — الطلبات الجديدة فقط
        saveNewCoerciveRequest(actionType, details, deps);
    };

    return saveCoerciveAction;
}
