import { useCallback } from 'react';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import { appendGuarantorFollowupRequest } from '@/app/utils/executorSeizureDecisionQueue';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import type { UseExecutionDashboardGuarantorFollowupHandlersParams } from './useExecutionDashboardGuarantorFollowupHandlers.types';

type OpenParams = Pick<
    UseExecutionDashboardGuarantorFollowupHandlersParams,
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'assignmentWorkspaceCtx'
    | 'nextTimelineId'
    | 'showToast'
    | 'openGuarantorDetailsModal'
    | 'setTimelineEvents'
>;

export function useGuarantorFollowupOpenHandlers(p: OpenParams) {
    const handleGuarantorRequestFromFollowup = useCallback(() => {
        if (guarantorFollowupAwaitingDetailsSave(p.executionData?.guarantor_followup)) {
            p.openGuarantorDetailsModal();
            return;
        }
        const gReq = appendGuarantorFollowupRequest({ executionId: p.decisionsStorageExecutionId });
        if (!gReq.ok) {
            p.showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                decisionsLink: true,
                decisionsTab: 'current',
            });
            return;
        }
        if (gReq.decisionId) {
            const ts = new Date().toISOString();
            p.setTimelineEvents((prev) => [
                {
                    id: p.nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: 'طلب إدخال كفيل ضامن — قيد البت',
                    type: 'decision',
                    source: 'القرارات والطعون',
                    metadata: {
                        ...timelineDebtorMetadata(p.assignmentWorkspaceCtx.activeDebtorKey),
                        timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                        decisionRowId: gReq.decisionId,
                    },
                },
                ...prev,
            ]);
        }
        p.showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: gReq.decisionId,
            decisionsTab: 'current',
        });
    }, [
        p.assignmentWorkspaceCtx.activeDebtorKey,
        p.decisionsStorageExecutionId,
        p.executionData?.guarantor_followup,
        p.nextTimelineId,
        p.openGuarantorDetailsModal,
        p.setTimelineEvents,
        p.showToast,
    ]);

    return { handleGuarantorRequestFromFollowup };
}
