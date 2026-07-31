import React, { useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { PersonalCoerciveActionGateKey } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type { PersonalCoerciveSubtypeOutcome } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';

type ShowToast = (
    msg: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    opts?: {
        decisionsLink?: boolean;
        decisionsTab?: 'current' | 'previous' | 'appeals';
        decisionId?: string;
        action?: { label: string; onClick: () => void };
    }
) => void;

export interface UsePersonalCoerciveActionGatesOptions {
    relaxedPersonal: boolean;
    debtorNotified: boolean;
    gracePeriodEndedFlag: boolean;
    onOpenSummonsCenter: () => void;
    showToast: ShowToast;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    executionData: ExecutionFile | null;
    forced: PersonalCoerciveSubtypeOutcome;
    forcedEffective: PersonalCoerciveSubtypeOutcome;
    forcedSync: PersonalCoerciveAppealSyncView;
    forcedNeedsOutcomeUi: boolean;
    outcome: string | null;
    investigationCourtWithdrawn: boolean;
    arrest: PersonalCoerciveSubtypeOutcome;
    arrestStage: string;
    wanted: boolean;
    warrantCustodyRecorded: boolean;
    investigationSessionOpen: boolean;
    hideExecutorForcedBringActivation: boolean;
    sendingKey: PersonalCoerciveActionGateKey | null;
    setSendingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    submitRequest: (
        subtype: PersonalCoerciveSubtype,
        title: string,
        body: string,
        opts?: { skipTimeline?: boolean; byExecutorOrder?: boolean }
    ) => Promise<string | null>;
    forcedSummonAllowed: boolean;
    forcedSummonLockReason?: string;
    dossierCycleActive: boolean;
    dossier: PersonalCoerciveSubtypeOutcome;
    detentionLaneEnded: boolean;
    detentionInAbsentia: boolean;
    debtorPresentEffective: boolean;
    travel: PersonalCoerciveSubtypeOutcome;
    travelActive: boolean;
    travelShowLiftAction: boolean;
    travelBanEnforced: boolean;
    travelBanWithdrawn: boolean;
    travelCycleActive: boolean;
    travelBanRequestCycleWithdrawn: boolean;
    travelLaneSettled: boolean;
    travelSync: PersonalCoerciveAppealSyncView;
    showEmbeddedSection: (key: 'travel_ban') => boolean;
}

/**
 * لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ — بوابة التبليغ الموحّدة
 * وعناوين/حالات تعطيل أزرار كل مسار إكراهي (إحضار/مفاتحة/منع سفر/عرض إضبارة).
 */
export function usePersonalCoerciveActionGates({
    relaxedPersonal,
    debtorNotified,
    gracePeriodEndedFlag,
    onOpenSummonsCenter,
    showToast,
    coerciveUiLocked,
    isHistoricalMode,
    executionData,
    forced,
    forcedEffective,
    forcedSync,
    forcedNeedsOutcomeUi,
    outcome,
    investigationCourtWithdrawn,
    arrest,
    arrestStage,
    wanted,
    warrantCustodyRecorded,
    investigationSessionOpen,
    hideExecutorForcedBringActivation,
    sendingKey,
    setSendingKey,
    setConfirmingKey,
    submitRequest,
    forcedSummonAllowed,
    forcedSummonLockReason,
    dossierCycleActive,
    dossier,
    detentionLaneEnded,
    detentionInAbsentia,
    debtorPresentEffective,
    travel,
    travelActive,
    travelShowLiftAction,
    travelBanEnforced,
    travelBanWithdrawn,
    travelCycleActive,
    travelBanRequestCycleWithdrawn,
    travelLaneSettled,
    travelSync,
    showEmbeddedSection,
}: UsePersonalCoerciveActionGatesOptions) {
    const notifyDebtorFirstToast = useCallback(() => {
        showToast('يجب تبليغ المدين أولاً قبل استخدام هذا الإجراء.', 'warning', {
            action: {
                label: 'مركز التبليغات',
                onClick: () => onOpenSummonsCenter(),
            },
        });
    }, [onOpenSummonsCenter, showToast]);

    const guardSummonsGate = useCallback((): boolean => {
        if (relaxedPersonal) return true;
        if (!debtorNotified) {
            notifyDebtorFirstToast();
            return false;
        }
        if (gracePeriodEndedFlag) return true;
        showToast(
            'لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ أو انتهاء المهلة دون حضور طوعي.',
            'warning',
            {
                action: {
                    label: 'مركز التبليغات',
                    onClick: () => onOpenSummonsCenter(),
                },
            }
        );
        return false;
    }, [
        relaxedPersonal,
        debtorNotified,
        gracePeriodEndedFlag,
        notifyDebtorFirstToast,
        onOpenSummonsCenter,
        showToast,
    ]);

    const canSubmitTravelBan =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;

    const investigationPathSettled = executionData?.investigationPathDebtorPresent === true;
    const canWithdrawInvestigationPath =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forced.alternative &&
        !forced.rejected &&
        !forcedNeedsOutcomeUi &&
        !investigationCourtWithdrawn &&
        !investigationPathSettled &&
        (outcome === 'absconded' ||
            executionData?.investigationCourtRequested === true ||
            arrest.pending ||
            (arrest.approved && investigationSessionOpen));

    const forcedButtonLabel = canWithdrawInvestigationPath
        ? 'الإحضار الجبري — تنازل عن مفاتحة التحقيق'
        : forcedEffective.pending
          ? 'الإحضار الجبري — قيد البت'
          : forcedEffective.alternative
            ? 'الإحضار الجبري — قرار بديل'
            : forcedEffective.rejected
              ? 'الإحضار الجبري — مرفوض'
              : forcedSync.blocksFieldwork
                ? 'الإحضار الجبري — موقوف (تظلم/طعن)'
                : forcedNeedsOutcomeUi
                  ? 'الإحضار الجبري — تسجيل النتيجة'
                : outcome === 'absconded'
                  ? 'الإحضار الجبري — متخفي'
                  : 'الإحضار الجبري';
    const forcedShowStartStrip =
        !hideExecutorForcedBringActivation &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forcedEffective.pending &&
        !forcedEffective.rejected &&
        !forcedNeedsOutcomeUi &&
        !forcedSync.followupBlock &&
        !forcedEffective.alternative &&
        !canWithdrawInvestigationPath;

    const forcedButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        forcedEffective.alternative ||
        forcedEffective.rejected ||
        forcedEffective.pending;

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
            setSendingKey,
        ]
    );

    const dossierCanResubmitToExecutor = dossierCycleActive && dossier.rejected;

    const canSubmitExecutiveDetention =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !dossier.pending &&
        (detentionLaneEnded ||
            detentionInAbsentia ||
            debtorPresentEffective ||
            relaxedPersonal ||
            dossierCanResubmitToExecutor);

    const runDossierPresentationSubmit = React.useCallback(() => {
        if (sendingKey === 'executive_dossier_presentation') return;
        if (dossier.pending) return;
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !detentionInAbsentia &&
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
            detentionInAbsentia
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
        debtorPresentEffective,
        dossier.pending,
        dossierCanResubmitToExecutor,
        detentionInAbsentia,
        guardSummonsGate,
        relaxedPersonal,
        sendingKey,
        showToast,
        submitRequest,
        setSendingKey,
        setConfirmingKey,
    ]);

    const investigationButtonLabel = arrest.pending
        ? 'مفاتحة محكمة التحقيق'
        : arrest.alternative
          ? 'مفاتحة محكمة التحقيق — قرار بديل'
          : (arrestStage === 'issued' || wanted) && warrantCustodyRecorded
            ? 'مفاتحة محكمة التحقيق — تم القبض'
            : arrest.approved && (investigationSessionOpen || arrestStage === 'issued' || wanted)
              ? 'مفاتحة محكمة التحقيق — تسجيل النتيجة'
              : 'مفاتحة محكمة التحقيق — أمر قبض';
    const investigationButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        arrest.alternative ||
        ((arrestStage === 'issued' || wanted) && warrantCustodyRecorded);

    const travelButtonLabel = travel.pending
        ? 'منع سفر — قيد البت'
        : travel.alternative
          ? 'منع سفر — قرار بديل'
          : travelShowLiftAction
            ? 'رفع منع السفر'
            : travelBanEnforced && !travelBanWithdrawn
              ? 'منع سفر — مفعّل'
              : travel.approved && travelCycleActive && !travelBanEnforced
                ? 'منع سفر — موافق عليه'
              : travel.rejected && travelCycleActive
                ? 'منع سفر — مرفوض'
                : 'تقديم طلب منع سفر';
    const travelSubmitButtonDisabled =
        isHistoricalMode || coerciveUiLocked || travel.alternative || !canSubmitTravelBan;
    const travelAppealFollowupVisible =
        Boolean(travelSync.followupBlock) &&
        Boolean(travelSync.decisionId) &&
        !travelSync.cycleSuperseded;
    const travelEnforcedSettled =
        travelBanEnforced &&
        !travelBanWithdrawn &&
        !travelBanRequestCycleWithdrawn &&
        travelLaneSettled;
    const showTravelBanSection = showEmbeddedSection('travel_ban');

    return {
        guardSummonsGate,
        canSubmitTravelBan,
        canWithdrawInvestigationPath,
        forcedButtonLabel,
        forcedShowStartStrip,
        forcedButtonDisabled,
        runForcedBringSubmit,
        dossierCanResubmitToExecutor,
        canSubmitExecutiveDetention,
        runDossierPresentationSubmit,
        investigationButtonLabel,
        investigationButtonDisabled,
        travelButtonLabel,
        travelSubmitButtonDisabled,
        travelAppealFollowupVisible,
        travelEnforcedSettled,
        showTravelBanSection,
    };
}
