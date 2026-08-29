import React, { useCallback } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildForcedBringPersonalOutcomePatch,
    type ForcedBringPersonalOutcome,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';

import type { PersonalCoerciveActionsCtx } from './types';

export function usePersonalCoerciveForcedBringActions(ctx: PersonalCoerciveActionsCtx, core: Pick<PersonalCoerciveSubmitCore, 'submitRequest' | 'guardSummonsGate'>) {
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

    const { submitRequest, guardSummonsGate } = core;

    const recordForcedOutcome = (v: ForcedBringPersonalOutcome) => {
        if (forcedSync.blocksFieldwork) {
            showToast(
                forcedSync.followupBlock?.message ??
                    'لا يمكن تسجيل النتيجة — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: forcedSync.decisionsNav.decisionsTab,
                                decisionId:
                                    forcedSync.decisionId ??
                                    findLatestDecisionIdForSubtype('forced_bring_in') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const basePatch = buildForcedBringPersonalOutcomePatch(v);
        const persisted = persistExecutionMerge(basePatch);
        if (persisted === false) {
            showToast('تعذّر حفظ نتيجة الإحضار — أعِد المحاولة', 'error');
            return;
        }
        setOptimisticForcedOutcome(v === 'absconded' ? 'absconded' : null);
        setForcedOutcomePick('');

        const now = new Date().toISOString();
        const label =
            v === 'brought'
                ? '✅ تم إحضار المدين أمام المنفذ'
                : v === 'dismissed'
                  ? '↩️ تم تجاهل متابعة الإحضار الجبري'
                  : '⚠️ المدين متخفي عن الأنظار';
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: label,
            description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setLocalDecisionsTick((n) => n + 1);
        setForcedInlineResolved(null);

        if (v === 'brought') {
            showToast('تم التسجيل — أُعيدت دورة الإحضار الجبري ويمكنك تقديم طلب جديد عند الحاجة.', 'success');
            return;
        }
        if (v === 'dismissed') {
            showToast('تم التجاهل — أُعيدت دورة الإحضار الجبري ويمكنك تقديم طلب جديد عند الحاجة.', 'info');
            return;
        }

        showToast('تم تسجيل «متخفي عن الأنظار» — اضغط بطاقة مفاتحة التحقيق لتقديم الطلب يدوياً.', 'success');
    };

    const forcedButtonLabel = forcedEffective.pending
          ? 'الإحضار الجبري — قيد البت'
          : forcedEffective.alternative
            ? 'الإحضار الجبري — قرار بديل'
            : forcedEffective.rejected
              ? 'الإحضار الجبري — مرفوض'
              : forcedOutcomeAbsconded
                ? 'الإحضار الجبري — متخفي عن الأنظار'
                : forcedSync.blocksFieldwork
                  ? 'الإحضار الجبري — موقوف (تظلم/طعن)'
                  : forcedNeedsOutcomeUi
                    ? 'الإحضار الجبري — تسجيل النتيجة'
                    : 'الإحضار الجبري';
    const forcedActivationGateOpen =
        !forcedOutcomeAbsconded &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forcedEffective.pending &&
        !forcedEffective.rejected &&
        !forcedNeedsOutcomeUi &&
        !forcedSync.followupBlock &&
        !forcedEffective.alternative;
    const forcedShowStartStrip = forcedActivationGateOpen;

    const forcedButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        forcedOutcomeAbsconded ||
        forcedEffective.alternative ||
        forcedEffective.rejected ||
        forcedEffective.pending;

    const handleForcedBringHeaderClick = useCallback(() => {
        if (forcedButtonDisabled) return;
        if (forcedAwaitingOutcome || forcedFlowStep === 'outcome_choice') {
            showToast('سجّل نتيجة الإحضار الجبري في القسم أسفل هذه البطاقة.', 'info');
            return;
        }
        if (forcedSync.followupBlock || forcedSync.blocksFieldwork) return;
        if (forcedShowStartStrip) {
            showToast('اختر «تفعيل بقرار المنفذ العدل» أو «إرسال طلب للقرارات» من القسم أدناه.', 'info');
            return;
        }
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (!relaxedPersonal && !forcedSummonAllowed) {
            showToast(
                forcedSummonLockReason ||
                    'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                'warning',
                {
                    action: {
                        label: 'مركز التبليغات',
                        onClick: () => onOpenSummonsCenter(),
                    },
                }
            );
            return;
        }
        setConfirmingKey('forced_bring_in');
    }, [
        forcedAwaitingOutcome,
        forcedButtonDisabled,
        forcedFlowStep,
        forcedSummonAllowed,
        forcedSummonLockReason,
        forcedSync.blocksFieldwork,
        forcedSync.followupBlock,
        forcedShowStartStrip,
        guardSummonsGate,
        onOpenSummonsCenter,
        relaxedPersonal,
        showToast,
    ]);

    const runForcedBringSubmit = React.useCallback(
        (byExecutorOrder: boolean) => {
            if (sendingKey === 'forced_bring_in') return;
            if (!byExecutorOrder) {
                if (!relaxedPersonal && !guardSummonsGate()) return;
                if (!relaxedPersonal && !forcedSummonAllowed) {
                    showToast(
                        forcedSummonLockReason ||
                            'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                        'warning',
                        {
                            action: {
                                label: 'مركز التبليغات',
                                onClick: () => onOpenSummonsCenter(),
                            },
                        }
                    );
                    return;
                }
            }
            setSendingKey('forced_bring_in');
            void submitRequest(
                'forced_bring_in',
                byExecutorOrder ? 'إحضار جبري — بقرار المنفذ العدل' : 'طلب إحضار جبري للمدين',
                byExecutorOrder
                    ? 'تفعيل مسار الإحضار الجبري بناءً على قرار صادر من منفذ العدل — دون انتظار طلب دائن.'
                    : 'طلب إحضار بالقوة لمثول المدين أمام دائرة التنفيذ بعد انتهاء المهلة دون حضور طوعي.',
                { byExecutorOrder }
            ).then(() => {
                setSendingKey(null);
            });
        },
        [
            forcedSummonAllowed,
            forcedSummonLockReason,
            guardSummonsGate,
            onOpenSummonsCenter,
            relaxedPersonal,
            sendingKey,
            showToast,
            submitRequest,
        ]
    );

    return {
        recordForcedOutcome,
        forcedButtonLabel,
        forcedActivationGateOpen,
        forcedShowStartStrip,
        forcedButtonDisabled,
        handleForcedBringHeaderClick,
        runForcedBringSubmit,
    };
}
