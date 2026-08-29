import React, { useCallback } from 'react';
import {
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildInvestigationCourtWithdrawExecutionPatch,
    buildInvestigationDebtorAttendedPatch,
    buildInvestigationWarrantIssuedPatch,
    buildInvestigationSecuredBringPatch,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';

import type { PersonalCoerciveActionsCtx } from './types';

export function usePersonalCoerciveInvestigationActions(ctx: PersonalCoerciveActionsCtx, core: Pick<PersonalCoerciveSubmitCore, 'submitRequest'>) {
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

    const showInvestigationBlock =
        !employeeDetentionRestricted &&
        shouldShowInvestigationCourtBlock(executionDataEffective, arrest);

    const closeInvestigationAndForcedBringDecisionCycles = () => {
        if (!exId) return;
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'arrest_warrant_investigation',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setLocalDecisionsTick((n) => n + 1);
    };

    const recordInvestigationDebtorAttended = () => {
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن تسجيل نتيجة المفاتحة — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationDebtorAttendedPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ حضور المدين — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم حضور المدين (مفاتحة محكمة التحقيق)',
            description:
                'تسجيل مثول المدين — أُغلقت دورة المفاتحة وأُعيدت دورة الإحضار الجبري لطلب جديد عند الحاجة.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        dispatchDecisionsReload();
        showToast('تم التسجيل — أُعيدت دورة الإحضار الجبري.', 'success');
    };

    const markWarrantIssued = () => {
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن إصدار مذكرة القبض — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationWarrantIssuedPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ صدور أمر القبض — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '🔴 تم صدور أمر القبض',
            description: 'تأشير على صدور مذكرة القبض. (المدين)',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تسجيل صدور أمر القبض — أكمل بتأمين الإحضار.', 'success');
    };

    const recordSecuredBringAfterWarrant = () => {
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن تأمين الإحضار — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationSecuredBringPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ تأمين الإحضار — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين',
            description:
                'تسجيل تنفيذ مذكرة القبض وتأمين الإحضار — أُغلقت دورة المفاتحة وأُعيدت دورة الإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        dispatchDecisionsReload();
        showToast('تم تأمين الإحضار — أُعيدت دورة الإحضار الجبري.', 'success');
    };

    const withdrawInvestigationCourtPath = useCallback(() => {
        if (forcedBringWithdrawBusy) return;
        setForcedBringWithdrawBusy(true);
        const now = new Date().toISOString();
        const resetPatch = buildInvestigationCourtWithdrawExecutionPatch(now);
        const arrestDecisionId = findLatestDecisionIdForSubtype('arrest_warrant_investigation');
        if (arrestDecisionId && exKey) {
            syncPersonalCoerciveWithdrawn({
                executionId: exKey,
                decisionId: arrestDecisionId,
                subtype: 'arrest_warrant_investigation',
                extraMerge: resetPatch,
            });
        }
        persistExecutionMerge(resetPatch);
        if (!arrestDecisionId) {
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: '↩️ التراجع عن مفاتحة محكمة التحقيق',
                description:
                    'تنازل عن مسار المفاتحة — أُعيد تفعيل الإحضار الجبري لتسجيل النتيجة. تظهر بطاقة المفاتحة مجدداً بعد تسجيل «متخفي» من جديد.',
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
        }
        setForcedBringWithdrawConfirmOpen(false);
        setForcedBringWithdrawBusy(false);
        setConfirmingKey(null);
        setForcedOutcomePick('');
        setOptimisticForcedOutcome(null);
        setForcedInlineResolved(null);
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
        showToast(
            'تم التنازل عن مفاتحة التحقيق — سجّل نتيجة الإحضار الجبري من جديد.',
            'success'
        );
    }, [
        debtorTimelineMeta,
        exKey,
        findLatestDecisionIdForSubtype,
        forcedBringWithdrawBusy,
        getLocalTodayYmd,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
    ]);

    const runArrestInvestigationSubmit = React.useCallback(() => {
        if (sendingKey === 'arrest_warrant_investigation') return;
        if (arrest.pending) return;
        setSendingKey('arrest_warrant_investigation');
        void submitRequest(
            'arrest_warrant_investigation',
            'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
            'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.'
        ).then(() => {
            setSendingKey(null);
            setConfirmingKey(null);
        });
    }, [arrest.pending, sendingKey, submitRequest]);

    const investigationAwaitingManualSend =
        investigationFlowStep === 'hub' &&
        outcome === 'absconded' &&
        !arrest.pending &&
        !arrest.approved &&
        !arrest.alternative &&
        !arrest.rejected &&
        !warrantCustodyRecorded;

    const investigationButtonLabel = arrest.pending
        ? 'مفاتحة محكمة التحقيق'
        : arrest.alternative
          ? 'مفاتحة محكمة التحقيق — قرار بديل'
          : (arrestStage === 'issued' || wanted) && warrantCustodyRecorded
            ? 'مفاتحة محكمة التحقيق — تم القبض'
            : arrest.approved && (investigationSessionOpen || arrestStage === 'issued' || wanted)
              ? 'مفاتحة محكمة التحقيق — تسجيل النتيجة'
              : investigationAwaitingManualSend
                ? 'مفاتحة محكمة التحقيق — تقديم الطلب'
                : 'مفاتحة محكمة التحقيق — أمر قبض';
    const investigationButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        arrest.alternative ||
        ((arrestStage === 'issued' || wanted) && warrantCustodyRecorded);

    return {
        showInvestigationBlock,
        closeInvestigationAndForcedBringDecisionCycles,
        recordInvestigationDebtorAttended,
        markWarrantIssued,
        recordSecuredBringAfterWarrant,
        withdrawInvestigationCourtPath,
        runArrestInvestigationSubmit,
        investigationAwaitingManualSend,
        investigationButtonLabel,
        investigationButtonDisabled,
    };
}
