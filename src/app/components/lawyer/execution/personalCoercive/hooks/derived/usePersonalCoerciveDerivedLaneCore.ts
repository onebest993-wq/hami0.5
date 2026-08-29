import React, { useMemo, useCallback, useEffect } from 'react';
import {
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
    getGoverningDossierPresentationRowFromDecisions,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isDebtorTravelBanActive,
    isDebtorTravelBanCycleWithdrawn,
    isDebtorTravelBanWithdrawn,
} from '@/app/utils/coerciveDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    buildExecutiveDetentionReleasePatch,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { buildPersonalCoerciveAppealExecutionSyncPatch } from '@/app/utils/personalCoerciveAppealSync';

import type { PersonalCoerciveDerivedCtx } from './types';

export function usePersonalCoerciveDerivedLaneCore(ctx: PersonalCoerciveDerivedCtx) {
    const {
        coerciveUiLocked,
        gracePeriodEndedFlag,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        hideDossierJudgePresentation,
        hideExecutiveDetentionJudgeCard,
        decisionsReloadEpoch,
        allDecisionRows,
        applyOptimisticPersistPatch,
        arrest,
        arrestSync,
        coerciveWriteLocked,
        debtorNotified,
        detentionLaneEnded,
        detentionPeriodNaturalEnd,
        detentionReleasedAt,
        dossier,
        dossierEffective,
        dossierInlineResolved,
        dossierPhaseEffective,
        dossierSync,
        employeeDetentionRestricted,
        exId,
        executionDataEffective,
        findGoverningDossierDecisionId,
        findLatestDecisionIdForSubtype,
        findLatestDecisionRowForSubtype,
        forced,
        forcedEffective,
        forcedInlineResolved,
        forcedSync,
        fullPersonalCoerciveCycleClosed,
        hasOpenCardForSubtype,
        judgeDetailsOpen,
        judgeSync,
        localDecisionsTick,
        optionalRemainingProceduresOpen,
        relaxedPersonal,
        sendingKey,
        setDossierInlineResolved,
        setForcedInlineResolved,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        showEmbeddedSection,
        travel,
        travelSync,
    } = ctx;

    const outcome = executionDataEffective?.forced_bring_in_personal_outcome ?? null;
    const forcedOutcomeAbsconded =
        String(outcome ?? '').trim() === 'absconded' ||
        executionDataEffective?.debtorEvaded === true;
    const forcedOutcomeRecorded = forcedOutcomeAbsconded;
    const showForcedBringInSection = showEmbeddedSection('forced_bring_in');
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


    const arrestStage = executionDataEffective?.personal_arrest_warrant_stage ?? 'none';
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
        (executionDataEffective?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ??
        null;
    const detentionJudgeEligibleDecisionId =
        executionDataEffective?.executive_detention_judge_eligible_decision_id ?? null;
    const dossierGoverningRow = useMemo(
        () =>
            getGoverningDossierPresentationRowFromDecisions(allDecisionRows, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
    );
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
    const wanted = executionDataEffective?.debtor_wanted_arrest_warrant === true;
    const detentionActive = isExecutiveDetentionPeriodActive(executionDataEffective);
    const detentionUntil = executionDataEffective?.executive_detention_until ?? null;
    const detentionInAbsentia = executionData?.executive_detention_request_in_absentia === true;
    const inAbsentia = detentionInAbsentia;
    /** مسار غيابي — من العلم المخزَّن أو من نتيجة «متخفي عن الأنظار» */
    const dossierAbsentiaPathOpen = detentionInAbsentia || forcedOutcomeAbsconded;
    const canActivateDossierAbsentiaPath =
        !dossierAbsentiaPathOpen &&
        !debtorPresentEffective &&
        !relaxedPersonal &&
        (forcedOutcomeAbsconded || gracePeriodEndedFlag);

    const executionPatchDiffers = useCallback(
        (patch: Record<string, unknown> | null | undefined): boolean => {
            if (!patch || Object.keys(patch).length === 0) return false;
            const ed = executionData as Record<string, unknown> | null | undefined;
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
            executionData: executionData as Record<string, unknown> | null,
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

    /** إغلاق مسار الحبس/الإضبارة تلقائياً عند انتهاء المدة — يعود طلب العرض للتفعيل اليدوي */
    useEffect(() => {
        if (isHistoricalMode || !executionData || !exId || !detentionPeriodNaturalEnd) return;
        const nowIso = new Date().toISOString();
        const patch = {
            ...buildExecutiveDetentionReleasePatch(nowIso),
            executive_detention_release_reason: 'انتهاء مدة الحبس التنفيذي',
        };
        if (!executionPatchDiffers(patch)) return;
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) return;
        applyOptimisticPersistPatch(patch);
        archiveExecutiveDetentionCycleDecisions({
            executionId: exId,
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setDossierInlineResolved(null);
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
    }, [
        activeDebtorKey,
        applyOptimisticPersistPatch,
        detentionPeriodNaturalEnd,
        executionData,
        executionPatchDiffers,
        exId,
        isHistoricalMode,
        persistExecutionMerge,
        primaryDebtorKey,
    ]);

    return {
        outcome,
        forcedOutcomeAbsconded,
        forcedOutcomeRecorded,
        showForcedBringInSection,
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
        detentionUntil,
        detentionInAbsentia,
        inAbsentia,
        dossierAbsentiaPathOpen,
        canActivateDossierAbsentiaPath,
        executionPatchDiffers,
    };
}
