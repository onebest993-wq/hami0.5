import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';

export interface UsePersonalCoerciveTravelBanActionsOptions {
    travelBanEnforced: boolean;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    debtRemainingIqd: number;
    isHistoricalMode: boolean;
    coerciveUiLocked: boolean;
    travelBanWithdrawn: boolean;
    executionData: ExecutionFile | null;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    exId: string;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    findLatestDecisionIdForSubtype: (subtype: 'travel_ban') => string | null;
    setTravelPanelOpen: (open: boolean) => void;
    setConfirmingKey: (key: null) => void;
}

/** أفعال منع السفر — رفع الإشارة بعد السداد، والتراجع عن طلب قائم */
export function usePersonalCoerciveTravelBanActions({
    travelBanEnforced,
    showToast,
    debtRemainingIqd,
    isHistoricalMode,
    coerciveUiLocked,
    travelBanWithdrawn,
    executionData,
    activeDebtorKey,
    primaryDebtorKey,
    persistExecutionMerge,
    exId,
    setLocalDecisionsTick,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    findLatestDecisionIdForSubtype,
    setTravelPanelOpen,
    setConfirmingKey,
}: UsePersonalCoerciveTravelBanActionsOptions) {
    const liftTravelBanEnforcement = () => {
        if (!travelBanEnforced) {
            showToast('منع السفر غير مفعّل حالياً.', 'warning');
            return;
        }
        if (debtRemainingIqd > 0) {
            showToast('يُرفع منع السفر بعد سداد الدين بالكامل.', 'warning');
            return;
        }
        if (!travelBanEnforced || isHistoricalMode || coerciveUiLocked || travelBanWithdrawn) return;
        const now = new Date().toISOString();
        if (executionData) {
            persistExecutionMerge({
                ...buildDebtorTravelBanActivePatch(executionData, activeDebtorKey, primaryDebtorKey, false),
                ...buildDebtorTravelBanWithdrawnPatch(executionData, activeDebtorKey, primaryDebtorKey, now),
                ...buildDebtorTravelBanCycleWithdrawnPatch(executionData, activeDebtorKey, primaryDebtorKey, null),
            });
        } else {
            persistExecutionMerge({
                debtor_travel_ban_active: false,
                travel_ban_withdrawn_at: now,
                travel_ban_request_cycle_withdrawn_at: null,
            });
        }
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'travel_ban',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            setLocalDecisionsTick((n) => n + 1);
        }
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: 'رفع منع السفر',
            description: 'تم رفع إشارة منع السفر بعد سداد الدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم رفع منع السفر.', 'success');
    };

    const withdrawTravelBanRequestCycle = () => {
        if (isHistoricalMode || coerciveUiLocked) return;
        if (!travelBanEnforced || travelBanWithdrawn) {
            showToast('لا يوجد طلب منع سفر نافذ للتراجع عنه.', 'warning');
            return;
        }
        const now = new Date().toISOString();
        const decisionId = findLatestDecisionIdForSubtype('travel_ban');
        if (decisionId && exId) {
            const extraMerge = executionData
                ? {
                      ...buildDebtorTravelBanActivePatch(executionData, activeDebtorKey, primaryDebtorKey, true),
                      ...buildDebtorTravelBanCycleWithdrawnPatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          now,
                      ),
                      ...buildDebtorTravelBanWithdrawnPatch(executionData, activeDebtorKey, primaryDebtorKey, null),
                  }
                : {
                      debtor_travel_ban_active: true,
                      travel_ban_request_cycle_withdrawn_at: now,
                      travel_ban_withdrawn_at: null,
                  };
            syncPersonalCoerciveWithdrawn({
                executionId: exId,
                decisionId,
                subtype: 'travel_ban',
                extraMerge,
            });
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'travel_ban',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
        } else {
            persistExecutionMerge({
                travel_ban_request_cycle_withdrawn_at: now,
                debtor_travel_ban_active: true,
                travel_ban_withdrawn_at: null,
            });
        }
        setTravelPanelOpen(false);
        setConfirmingKey(null);
        setLocalDecisionsTick((n) => n + 1);
        showToast('تم التراجع عن الطلب — يبقى المنع مفعّلاً حتى سداد الدين.', 'success');
    };

    return { liftTravelBanEnforcement, withdrawTravelBanRequestCycle };
}
