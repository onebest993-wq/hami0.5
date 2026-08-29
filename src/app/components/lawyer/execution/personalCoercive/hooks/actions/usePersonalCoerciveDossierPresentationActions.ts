import React, { useCallback, useMemo } from 'react';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';

import type { PersonalCoerciveActionsCtx } from './types';

export function usePersonalCoerciveDossierPresentationActions(ctx: PersonalCoerciveActionsCtx, core: Pick<PersonalCoerciveSubmitCore, 'submitRequest' | 'guardSummonsGate'>) {
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

    const dossierCanResubmitToExecutor = dossierCycleActive && dossierEffective.rejected;

    const canSubmitExecutiveDetention =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !dossierEffective.pending &&
        (detentionLaneEnded ||
            dossierAbsentiaPathOpen ||
            debtorPresentEffective ||
            relaxedPersonal ||
            dossierCanResubmitToExecutor);

    const activateDossierAbsentiaPath = useCallback(() => {
        if (coerciveWriteLocked || dossierAbsentiaPathOpen) return;
        persistExecutionMerge({ executive_detention_request_in_absentia: true });
        showToast('تم تفعيل مسار الغياب لطلب عرض الإضبارة على قاضي البداءة.', 'success');
    }, [coerciveWriteLocked, dossierAbsentiaPathOpen, persistExecutionMerge, showToast]);

    const dossierSubmitBlockedReason = useMemo(() => {
        if (canSubmitExecutiveDetention) return null;
        if (dossierEffective.pending) return 'طلب عرض الإضبارة قيد البت لدى المنفذ.';
        if (!debtorPresentEffective && !dossierAbsentiaPathOpen && !relaxedPersonal) {
            if (canActivateDossierAbsentiaPath) {
                return 'فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.';
            }
            if (!debtorNotified) return 'يجب تبليغ المدين أولاً.';
            if (!gracePeriodEndedFlag) {
                return 'انتظر انتهاء مهلة الحضور الطوعي أو سجّل نتيجة الإحضار الجبري.';
            }
            return 'فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.';
        }
        return 'لا يمكن تقديم طلب عرض الإضبارة في الوضع الحالي.';
    }, [
        canActivateDossierAbsentiaPath,
        canSubmitExecutiveDetention,
        debtorNotified,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierEffective.pending,
        gracePeriodEndedFlag,
        relaxedPersonal,
    ]);

    const handleDossierHeaderClick = useCallback(() => {
        if (sendingKey === 'executive_dossier_presentation') return;
        if (coerciveWriteLocked) return;
        if (dossierEffective.pending) {
            showToast('طلب عرض الإضبارة قيد البت لدى المنفذ — راجع القسم أسفل البطاقة.', 'info');
            return;
        }
        if (!canSubmitExecutiveDetention) {
            if (dossierSubmitBlockedReason) {
                showToast(dossierSubmitBlockedReason, 'warning', {
                    action: dossierSubmitBlockedReason.includes('تبليغ')
                        ? { label: 'مركز التبليغات', onClick: () => onOpenSummonsCenter() }
                        : undefined,
                });
            }
            return;
        }
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !dossierAbsentiaPathOpen &&
            !debtorPresentEffective &&
            !relaxedPersonal
        ) {
            showToast('فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.', 'warning');
            return;
        }
        setConfirmingKey('executive_dossier_presentation');
    }, [
        canSubmitExecutiveDetention,
        coerciveWriteLocked,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierCanResubmitToExecutor,
        dossierEffective.pending,
        dossierSubmitBlockedReason,
        guardSummonsGate,
        onOpenSummonsCenter,
        relaxedPersonal,
        sendingKey,
        showToast,
    ]);

    const runDossierPresentationSubmit = React.useCallback(() => {
        if (sendingKey === 'executive_dossier_presentation') return;
        if (dossierEffective.pending) return;
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !dossierAbsentiaPathOpen &&
            !debtorPresentEffective &&
            !relaxedPersonal
        ) {
            showToast('فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.', 'warning');
            return;
        }
        setSendingKey('executive_dossier_presentation');
        void submitRequest(
            'executive_dossier_presentation',
            'طلب عرض الإضبارة على قاضي البداءة',
            dossierAbsentiaPathOpen
                ? 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين — وضع غيابي؛ امتناع عن التسديد دون مثول أمام المنفذ.'
                : 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد رغم مثوله أمام المنفذ دون تسوية مقبولة.'
        )
            .then(() => {
                setSendingKey(null);
                setConfirmingKey(null);
            })
            .catch(() => {
                setSendingKey(null);
                setConfirmingKey(null);
            });
    }, [
        coerciveUiLocked,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierCanResubmitToExecutor,
        dossierEffective.pending,
        guardSummonsGate,
        relaxedPersonal,
        sendingKey,
        showToast,
        submitRequest,
    ]);

    return {
        dossierCanResubmitToExecutor,
        canSubmitExecutiveDetention,
        activateDossierAbsentiaPath,
        dossierSubmitBlockedReason,
        handleDossierHeaderClick,
        runDossierPresentationSubmit,
    };
}
