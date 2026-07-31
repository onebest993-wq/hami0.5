import { useCallback, useEffect, useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    hasActivePersonalCoerciveSubtypeCard,
    getDossierPresentationOutcome,
    getGoverningDossierPresentationRow,
    getGuarantorRequestOutcome,
    getPersonalCoerciveSubtypeOutcome,
    readExecutorDecisionsArray,
} from '@/app/utils/executorDecisionReadQueries';
import {
    resolvePersonalCoerciveDecisionsNav,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { isDebtorNotifiedForCoerciveActions } from '@/app/utils/noticeDebtorScope';
import {
    isDebtorTravelBanActive,
    isDebtorTravelBanCycleWithdrawn,
    isDebtorTravelBanWithdrawn,
} from '@/app/utils/coerciveDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    isPersonalCoerciveCycleClosed,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { resolveAllPersonalCoerciveAppealSync, buildPersonalCoerciveAppealExecutionSyncPatch } from '@/app/utils/personalCoerciveAppealSync';

export interface UsePersonalCoercivePanelDerivedOptions {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    decisionsReloadEpoch: number;
    localDecisionsTick: number;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    isHistoricalMode: boolean;
    coerciveUiLocked: boolean;
    debtRemainingIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    forcedInlineResolved: 'approved' | 'rejected' | null;
    setForcedInlineResolved: (v: 'approved' | 'rejected' | null) => void;
}

/**
 * جوهر اشتقاق حالات وقرارات الإجراءات الجبرية الشخصية — مصدر واحد لعنوان البطاقة
 * وحاوية «تسجيل النتيجة» لكل مسار (إحضار/مفاتحة/منع سفر/عرض إضبارة)، بالإضافة إلى
 * مزامنة أعلام ملف التنفيذ عالقة القديمة مع مركز القرارات.
 */
export function usePersonalCoercivePanelDerived({
    executionId,
    executionData,
    decisionsReloadEpoch,
    localDecisionsTick,
    activeDebtorKey,
    primaryDebtorKey,
    isHistoricalMode,
    coerciveUiLocked,
    debtRemainingIqd,
    persistExecutionMerge,
    forcedInlineResolved,
    setForcedInlineResolved,
}: UsePersonalCoercivePanelDerivedOptions) {
    const decisionsVersion = useMemo(
        () => `${decisionsReloadEpoch}:${localDecisionsTick}`,
        [decisionsReloadEpoch, localDecisionsTick],
    );

    /** مفتاح تخزين القرارات — يفضّل executionId المُمرَّر (الإضبارة الأصلية) على id الملف المعروض */
    const exId = String(executionId ?? executionData?.id ?? '').trim();
    const exKey = exId || undefined;
    const debtorScopeOpts = useMemo(
        () => ({ debtorKey: activeDebtorKey, primaryDebtorKey }),
        [activeDebtorKey, primaryDebtorKey]
    );
    const decisionsNavForSubtype = useCallback(
        (subtype: PersonalCoerciveSubtype) =>
            resolvePersonalCoerciveDecisionsNav(exKey, subtype, debtorScopeOpts),
        [debtorScopeOpts, exKey]
    );
    const hasOpenCardForSubtype = useCallback(
        (subtype: PersonalCoerciveSubtype) =>
            hasActivePersonalCoerciveSubtypeCard(exKey, subtype, debtorScopeOpts),
        [debtorScopeOpts, exKey]
    );
    const debtorNotified = useMemo(
        () =>
            isDebtorNotifiedForCoerciveActions(
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
            ),
        [executionData, activeDebtorKey, primaryDebtorKey],
    );
    const debtorTimelineMeta = useMemo(
        () => timelineDebtorMetadata(activeDebtorKey),
        [activeDebtorKey]
    );
    const coerciveDecisionStates = useMemo(() => {
        void decisionsVersion;
        return {
            forced: getPersonalCoerciveSubtypeOutcome(exKey, 'forced_bring_in', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            arrest: getPersonalCoerciveSubtypeOutcome(exKey, 'arrest_warrant_investigation', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            travel: getPersonalCoerciveSubtypeOutcome(exKey, 'travel_ban', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            dossier: getDossierPresentationOutcome(exKey, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            guarantor: getGuarantorRequestOutcome(exKey),
        };
    }, [activeDebtorKey, decisionsVersion, exKey, primaryDebtorKey]);

    const coerciveWriteLocked = coerciveUiLocked || isHistoricalMode;

    const forced = coerciveDecisionStates.forced;
    const forcedEffective = useMemo(
        () => ({
            pending: forced.pending && forcedInlineResolved !== 'approved',
            approved: forced.approved || forcedInlineResolved === 'approved',
            rejected: forced.rejected || forcedInlineResolved === 'rejected',
            alternative: forced.alternative,
        }),
        [forced, forcedInlineResolved]
    );
    const arrest = coerciveDecisionStates.arrest;
    const travel = coerciveDecisionStates.travel;
    const dossier = coerciveDecisionStates.dossier;
    const dossierPhase = executionData?.executive_dossier_phase ?? null;
    const fullPersonalCoerciveCycleClosed = isPersonalCoerciveCycleClosed(executionData);
    const detentionReleasedAt = String(
        executionData?.executive_detention_released_or_closed_at ?? ''
    ).trim();
    /** انتهاء مسار الحبس/عرض الإضبارة فقط — لا يمسح إحضاراً أو منع سفر أو مفاتحة */
    const detentionLaneEnded =
        fullPersonalCoerciveCycleClosed || Boolean(detentionReleasedAt);
    const guarantorDec = coerciveDecisionStates.guarantor;
    const guarantorAwaitingSave = guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup);

    const allDecisionRows = useMemo(() => {
        void decisionsVersion;
        return readExecutorDecisionsArray(exId);
    }, [decisionsVersion, exId]);

    const appealSync = useMemo(
        () =>
            resolveAllPersonalCoerciveAppealSync({
                executionId: exId,
                allDecisions: allDecisionRows,
                executionData: executionData as unknown as Record<string, unknown> | null,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, allDecisionRows, exId, executionData, primaryDebtorKey]
    );
    const forcedSync = appealSync.forced_bring_in;
    const travelSync = appealSync.travel_ban;
    const arrestSync = appealSync.arrest_warrant_investigation;
    const dossierSync = appealSync.executive_dossier_presentation;
    const judgeSync = appealSync.executive_detention_judge;

    const outcome = executionData?.forced_bring_in_personal_outcome ?? null;
    const forcedOutcomeRecorded = useMemo(() => {
        const o = String(outcome ?? '').trim();
        return o === 'brought' || o === 'absconded';
    }, [outcome]);
    const forcedBringCycleResolved = useMemo(() => {
        if (forcedInlineResolved === 'approved') return false;
        if (forcedOutcomeRecorded) return true;
        /** موافقة منفذ بانتظار نتيجة — لا تُغلق الدورة بأعلام قديمة (debtorForcedToAttend…) */
        if (forcedEffective.approved && !forcedEffective.pending) return false;
        return isForcedBringCycleResolved(executionData);
    }, [
        executionData,
        forcedEffective.approved,
        forcedEffective.pending,
        forcedInlineResolved,
        forcedOutcomeRecorded,
    ]);
    /** مصدر واحد لعنوان البطاقة + حاوية «تسجيل النتيجة» — يعتمد على نتيجة صريحة فقط */
    const forcedNeedsOutcomeUi = resolveForcedBringNeedsOutcomeUi({
        forcedApproved: forcedEffective.approved,
        forcedPending: forcedEffective.pending,
        outcome,
        appealBlocksFieldwork: forcedSync.blocksFieldwork,
        requestEffectivelyEnforced: forcedSync.enforced,
        appealCycleSuperseded: forcedSync.cycleSuperseded,
    });

    const arrestStage = executionData?.personal_arrest_warrant_stage ?? 'none';
    const travelBanWithdrawn = isDebtorTravelBanWithdrawn(
        executionData,
        activeDebtorKey,
        primaryDebtorKey,
    );
    const travelBanRequestCycleWithdrawn = isDebtorTravelBanCycleWithdrawn(
        executionData,
        activeDebtorKey,
        primaryDebtorKey,
    );
    const travelCycleActive = hasOpenCardForSubtype('travel_ban');
    const travelLaneSettled =
        travelBanWithdrawn ||
        !travelCycleActive ||
        !isDebtorTravelBanActive(executionData, activeDebtorKey, primaryDebtorKey);
    const judgeDetentionStored =
        (executionData?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null;
    const detentionJudgeEligibleDecisionId =
        executionData?.executive_detention_judge_eligible_decision_id ?? null;
    const dossierGoverningRow = useMemo(() => {
        void decisionsVersion;
        return getGoverningDossierPresentationRow(exKey, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
    }, [activeDebtorKey, decisionsVersion, exKey, primaryDebtorKey]);
    const dossierCycleActive = Boolean(dossierGoverningRow);
    const judgeDetention = useMemo(
        () =>
            resolveExecutiveDetentionJudgeUiOutcome({
                storedOutcome: judgeDetentionStored,
                judgeRow: judgeSync.governingRow,
            }),
        [judgeSync.governingRow, judgeDetentionStored]
    );
    const travelBanEnforced =
        !travelBanWithdrawn &&
        isDebtorTravelBanActive(executionData, activeDebtorKey, primaryDebtorKey);
    const travelLiftReady =
        travelBanEnforced &&
        debtRemainingIqd <= 0 &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !travelBanWithdrawn;
    const travelShowLiftAction = travelLiftReady;
    const travelShowInitialSubmit =
        !travel.alternative &&
        !travel.pending &&
        !(travel.rejected && travelCycleActive) &&
        (!travelBanEnforced || travelBanRequestCycleWithdrawn) &&
        (!travelCycleActive || travelBanRequestCycleWithdrawn);
    const travelActive = travelBanEnforced && travelCycleActive;
    const wanted = executionData?.debtor_wanted_arrest_warrant === true;
    const detentionActive = isExecutiveDetentionPeriodActive(executionData);
    const detentionInAbsentia = executionData?.executive_detention_request_in_absentia === true;
    const inAbsentia = detentionInAbsentia;

    const executionPatchDiffers = useCallback(
        (patch: Record<string, unknown> | null | undefined): boolean => {
            if (!patch || Object.keys(patch).length === 0) return false;
            const ed = executionData as unknown as Record<string, unknown> | null | undefined;
            if (!ed) return true;
            return Object.entries(patch).some(([key, value]) => ed[key] !== value);
        },
        [executionData]
    );

    /** مزامنة ملف التنفيذ مع مركز القرارات — تصفير أعلام عالقة + نتيجة قاضي البداءة */
    useEffect(() => {
        if (!exId || isHistoricalMode) return;
        const patch = buildPersonalCoerciveAppealExecutionSyncPatch({
            executionId: exId,
            executionData: executionData as unknown as Record<string, unknown> | null,
            allDecisions: allDecisionRows,
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        if (executionPatchDiffers(patch)) persistExecutionMerge(patch!);
    }, [
        activeDebtorKey,
        allDecisionRows,
        decisionsReloadEpoch,
        executionData,
        exId,
        isHistoricalMode,
        localDecisionsTick,
        persistExecutionMerge,
        primaryDebtorKey,
        executionPatchDiffers,
    ]);

    /** جلسات قديمة: إزالة أعلام دورة كاملة أو إشعار حضور عالق بعد إخلاء السبيل */
    useEffect(() => {
        if (isHistoricalMode || !executionData) return;
        let patch: Record<string, unknown> | null = null;
        const notice = String(executionData.activeNoticeState ?? '').trim();
        if (fullPersonalCoerciveCycleClosed && detentionReleasedAt) {
            patch = { ...(patch || {}), personal_coercive_cycle_closed_at: null };
        }
        if (notice === 'forced_attendance' && forcedBringCycleResolved) {
            patch = {
                ...(patch || {}),
                activeNoticeState: null,
                forcedAttendanceIssued: false,
            };
        }
        if (
            notice === 'arrest_warrant' &&
            (executionData.debtorArrested === true || executionData.debtor_arrest_warrant_cleared_after_custody === true)
        ) {
            patch = { ...(patch || {}), activeNoticeState: null };
        }
        if (executionPatchDiffers(patch)) persistExecutionMerge(patch!);
    }, [
        detentionLaneEnded,
        detentionReleasedAt,
        executionData,
        executionData?.activeNoticeState,
        executionData?.debtorArrested,
        executionData?.debtor_arrest_warrant_cleared_after_custody,
        executionData?.personal_coercive_cycle_closed_at,
        forcedBringCycleResolved,
        fullPersonalCoerciveCycleClosed,
        isHistoricalMode,
        persistExecutionMerge,
        executionPatchDiffers,
    ]);

    const warrantCustodyRecorded = executionData?.debtor_arrest_warrant_cleared_after_custody === true;
    const investigationSessionOpen =
        executionData?.personal_arrest_investigation_session_open === true ||
        (executionData?.personal_arrest_investigation_session_open !== false &&
            arrest.approved &&
            arrestStage === 'pending_court');
    const investigationPostApprovalActive =
        arrest.approved &&
        !warrantCustodyRecorded &&
        (executionData?.investigationCourtRequested === true || investigationSessionOpen) &&
        arrestSync.enforced &&
        !arrestSync.cycleSuperseded &&
        !arrestSync.blocksFieldwork;

    const derivedInvestigationInnerStep = useMemo(() => {
        if (arrest.pending) return 'executor_pending' as const;
        if (!investigationPostApprovalActive) return 'hub' as const;
        if (arrestStage === 'issued' || wanted) return 'warrant_custody' as const;
        return 'outcome_choice' as const;
    }, [
        arrest.pending,
        investigationPostApprovalActive,
        arrestStage,
        wanted,
    ]);

    useEffect(() => {
        if (forcedInlineResolved === 'rejected' && forced.rejected && !forced.pending) {
            setForcedInlineResolved(null);
            return;
        }
        if (forcedInlineResolved !== 'approved') return;
        if (!forced.approved || forced.pending) return;
        const o = String(executionData?.forced_bring_in_personal_outcome ?? '').trim();
        if (o === 'brought' || o === 'absconded') {
            setForcedInlineResolved(null);
        }
    }, [
        executionData?.forced_bring_in_personal_outcome,
        forced.approved,
        forced.pending,
        forced.rejected,
        forcedInlineResolved,
        setForcedInlineResolved,
    ]);

    return {
        exId,
        exKey,
        decisionsVersion,
        decisionsNavForSubtype,
        hasOpenCardForSubtype,
        debtorNotified,
        debtorTimelineMeta,
        coerciveWriteLocked,
        forced,
        forcedEffective,
        arrest,
        travel,
        dossier,
        dossierPhase,
        fullPersonalCoerciveCycleClosed,
        detentionLaneEnded,
        guarantorDec,
        guarantorAwaitingSave,
        allDecisionRows,
        appealSync,
        forcedSync,
        travelSync,
        arrestSync,
        dossierSync,
        judgeSync,
        outcome,
        forcedBringCycleResolved,
        forcedNeedsOutcomeUi,
        arrestStage,
        travelBanWithdrawn,
        travelBanRequestCycleWithdrawn,
        travelCycleActive,
        travelLaneSettled,
        judgeDetentionStored,
        detentionJudgeEligibleDecisionId,
        dossierGoverningRow,
        dossierCycleActive,
        judgeDetention,
        travelBanEnforced,
        travelLiftReady,
        travelShowLiftAction,
        travelShowInitialSubmit,
        travelActive,
        wanted,
        detentionActive,
        detentionInAbsentia,
        inAbsentia,
        executionPatchDiffers,
        warrantCustodyRecorded,
        investigationSessionOpen,
        investigationPostApprovalActive,
        derivedInvestigationInnerStep,
    };
}
