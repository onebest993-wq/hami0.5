import React, { useCallback } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';

import type { PersonalCoerciveActionsCtx } from './types';

export function usePersonalCoerciveTravelBanActions(ctx: PersonalCoerciveActionsCtx, core: Pick<PersonalCoerciveSubmitCore, 'submitRequest'>) {
    const {
        coerciveUiLocked,
        gracePeriodEndedFlag,
        forcedSummonAllowed,
        forcedSummonLockReason,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        onOpenSummonsCenter,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        allDecisionRowsRef,
        appealSync,
        applyOptimisticPersistPatch,
        arrest,
        arrestStage,
        arrestSync,
        canActivateDossierAbsentiaPath,
        coerciveWriteLocked,
        confirmingKey,
        debtorNotified,
        debtorTimelineMeta,
        decisionsNavForSubtype,
        detentionJudgeEligibleDecisionId,
        detentionLaneEnded,
        dossierAbsentiaPathOpen,
        dossierCycleActive,
        dossierEffective,
        employeeDetentionRestricted,
        exId,
        exKey,
        executionDataEffective,
        findGoverningDossierDecisionId,
        findLatestDecisionIdForSubtype,
        forced,
        forcedAwaitingOutcome,
        forcedEffective,
        forcedFlowStep,
        forcedNeedsOutcomeUi,
        forcedOutcomeAbsconded,
        forcedSync,
        judgeDecisionIdStored,
        judgeRejectedResubmitVisible,
        judgeSync,
        outcome,
        relaxedPersonal,
        releaseConfirmBusy,
        renderWaiveInitialAppeal,
        scopedRequestTitle,
        sendingKey,
        setConfirmingKey,
        setDetentionRejectionOpen,
        setDetentionRejectionReason,
        setDossierInlineResolved,
        setForcedBringWithdrawBusy,
        setForcedBringWithdrawConfirmOpen,
        setForcedInlineResolved,
        setForcedOutcomePick,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setReleaseConfirmBusy,
        setReleaseConfirmOpen,
        setReleaseReason,
        setReleaseReasonOpen,
        setSendingKey,
        setTravelPanelOpen,
        travel,
        travelActive,
        travelBanEnforced,
        travelBanWithdrawn,
        wanted,
        warrantCustodyRecorded,
        investigationFlowStep,
        investigationSessionOpen,
        forcedBringWithdrawBusy,
        inAbsentia,
    } = ctx;

    const { submitRequest } = core;

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
                ...buildDebtorTravelBanActivePatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    false,
                ),
                ...buildDebtorTravelBanWithdrawnPatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    now,
                ),
                ...buildDebtorTravelBanCycleWithdrawnPatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    null,
                ),
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

    const withdrawTravelBanRequestCycle = useCallback(() => {
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
                      ...buildDebtorTravelBanActivePatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          true,
                      ),
                      ...buildDebtorTravelBanCycleWithdrawnPatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          now,
                      ),
                      ...buildDebtorTravelBanWithdrawnPatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          null,
                      ),
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
        showToast(
            'تم التراجع عن الطلب — يبقى المنع مفعّلاً حتى سداد الدين.',
            'success'
        );
    }, [
        activeDebtorKey,
        coerciveUiLocked,
        debtorTimelineMeta,
        exId,
        findLatestDecisionIdForSubtype,
        isHistoricalMode,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKey,
        pushTimelineEvent,
        showToast,
        travelBanEnforced,
        travelBanWithdrawn,
    ]);

    const canSubmitTravelBan =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;

    const runTravelBanSubmit = React.useCallback(() => {
        if (sendingKey === 'travel_ban') return;
        if (travel.pending) return;
        if (!canSubmitTravelBan) return;
        setSendingKey('travel_ban');
        void submitRequest(
            'travel_ban',
            scopedRequestTitle('طلب وضع إشارة منع سفر على المدين'),
            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
        ).then(() => {
            setSendingKey(null);
            setConfirmingKey(null);
        });
    }, [canSubmitTravelBan, scopedRequestTitle, sendingKey, submitRequest, travel.pending]);

    return {
        liftTravelBanEnforcement,
        withdrawTravelBanRequestCycle,
        canSubmitTravelBan,
        runTravelBanSubmit,
    };
}
