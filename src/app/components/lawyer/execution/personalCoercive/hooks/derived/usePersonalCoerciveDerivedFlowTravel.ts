import React, { useMemo, useCallback, useEffect } from 'react';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/coerciveDebtorScope';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { usePersonalCoerciveDerivedLaneCore } from './usePersonalCoerciveDerivedLaneCore';

import type { PersonalCoerciveDerivedCtx } from './types';

export function usePersonalCoerciveDerivedFlowTravel(ctx: PersonalCoerciveDerivedCtx, lane: Pick<
    ReturnType<typeof usePersonalCoerciveDerivedLaneCore>,
    | 'outcome'
    | 'forcedOutcomeAbsconded'
    | 'forcedOutcomeRecorded'
    | 'forcedBringCycleResolved'
    | 'forcedNeedsOutcomeUi'
    | 'arrestStage'
    | 'wanted'
    | 'travelBanEnforced'
    | 'travelBanWithdrawn'
    | 'travelBanRequestCycleWithdrawn'
    | 'travelCycleActive'
    | 'travelLaneSettled'
    | 'travelLiftReady'
    | 'travelShowLiftAction'
    | 'travelActive'
>) {
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

    const {
        outcome,
        forcedNeedsOutcomeUi,
        arrestStage,
        wanted,
        travelBanEnforced,
        travelBanWithdrawn,
        travelBanRequestCycleWithdrawn,
        travelCycleActive,
        travelLaneSettled,
        travelLiftReady,
        travelShowLiftAction,
        travelActive,
    } = lane;

    const warrantCustodyRecorded =
        executionDataEffective?.debtor_arrest_warrant_cleared_after_custody === true;
    const investigationSessionOpen =
        executionDataEffective?.personal_arrest_investigation_session_open === true ||
        (executionDataEffective?.personal_arrest_investigation_session_open !== false &&
            arrest.approved &&
            arrestStage === 'pending_court');
    const investigationPostApprovalActive =
        arrest.approved &&
        !warrantCustodyRecorded &&
        (executionDataEffective?.investigationCourtRequested === true || investigationSessionOpen) &&
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
        if (o === 'brought' || o === 'absconded' || o === 'dismissed') {
            setForcedInlineResolved(null);
        }
    }, [
        executionData?.forced_bring_in_personal_outcome,
        forced.approved,
        forced.pending,
        forced.rejected,
        forcedInlineResolved,
    ]);

    useEffect(() => {
        if (dossierInlineResolved === 'rejected' && dossier.rejected && !dossier.pending) {
            setDossierInlineResolved(null);
            return;
        }
        if (dossierInlineResolved !== 'approved') return;
        if (!dossier.approved || dossier.pending) return;
        const phase = String(executionData?.executive_dossier_phase ?? '').trim();
        if (
            phase === 'handed_to_judge' ||
            phase === 'judge_decided' ||
            phase === 'detention_active'
        ) {
            setDossierInlineResolved(null);
        }
    }, [
        dossier.approved,
        dossier.pending,
        dossier.rejected,
        dossierInlineResolved,
        executionData?.executive_dossier_phase,
    ]);


    const forcedGoverningRow = useMemo(
        () => findLatestDecisionRowForSubtype('forced_bring_in'),
        [findLatestDecisionRowForSubtype, decisionsReloadEpoch, localDecisionsTick]
    );
    const forcedByExecutorOrder = Boolean(
        (forcedGoverningRow as { activatedByExecutorOrder?: boolean } | null)?.activatedByExecutorOrder
    );

    const forcedAwaitingOutcome = forcedNeedsOutcomeUi;
    const forcedHasExpandablePanel =
        forcedNeedsOutcomeUi ||
        forcedEffective.pending ||
        forcedEffective.rejected ||
        Boolean(forcedSync.followupBlock) ||
        forcedSync.blocksFieldwork;

    const forcedFlowStep = useMemo(() => {
        if (forcedSync.followupBlock || forcedSync.blocksFieldwork) return 'followup_blocked' as const;
        if (forcedAwaitingOutcome) return 'outcome_choice' as const;
        return 'hub' as const;
    }, [forcedSync.blocksFieldwork, forcedSync.followupBlock, forcedAwaitingOutcome]);

    const investigationCompletionActive =
        investigationPostApprovalActive && !arrestSync.followupBlock;

    const investigationHasExpandablePanel =
        arrest.pending ||
        investigationPostApprovalActive ||
        Boolean(arrestSync.followupBlock) ||
        arrestSync.blocksFieldwork;

    const investigationFlowStep = useMemo(() => {
        if (arrestSync.followupBlock) return 'followup_blocked' as const;
        if (arrest.pending) return 'executor_pending' as const;
        if (!investigationCompletionActive) return 'hub' as const;
        return derivedInvestigationInnerStep;
    }, [
        arrest.pending,
        arrestSync.followupBlock,
        investigationCompletionActive,
        derivedInvestigationInnerStep,
    ]);

    /*
     * لا تشفير حقلي محلي: العنوان/النص على صف القرار أصلاً plaintext،
     * والإضبارة كاملة تُشفَّر فقط عند مزامنة السحابة (SupabaseService).
     * أي حمولة ciphertext قديمة على صف القرار تُتجاهل — لا تُقرأ ولا تُكتب.
     */

    const scopedRequestTitle = useCallback(
        (base: string) => {
            const name = resolveDebtorDisplayNameForKey(
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
            );
            if (!name) return base;
            return `${base} — ${name}`;
        },
        [executionData, activeDebtorKey, primaryDebtorKey],
    );

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
    const canSubmitTravelBanLocal =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;
    const travelSubmitButtonDisabled =
        isHistoricalMode || coerciveUiLocked || travel.alternative || !canSubmitTravelBanLocal;
    const travelRejectedAppealOpen =
        travel.rejected &&
        travelCycleActive &&
        !isExecutorRejectedAppealFollowupDismissed(
            findLatestDecisionIdForSubtype('travel_ban'),
            allDecisionRows
        );
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
        warrantCustodyRecorded,
        investigationSessionOpen,
        investigationPostApprovalActive,
        derivedInvestigationInnerStep,
        forcedGoverningRow,
        forcedByExecutorOrder,
        forcedAwaitingOutcome,
        forcedHasExpandablePanel,
        forcedFlowStep,
        investigationCompletionActive,
        investigationHasExpandablePanel,
        investigationFlowStep,
        scopedRequestTitle,
        travelButtonLabel,
        travelSubmitButtonDisabled,
        travelRejectedAppealOpen,
        travelAppealFollowupVisible,
        travelEnforcedSettled,
        showTravelBanSection,
    };
}
