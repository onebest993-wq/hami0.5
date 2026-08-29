import React, { useEffect } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { usePersonalCoerciveDerivedLaneCore } from './usePersonalCoerciveDerivedLaneCore';

import type { PersonalCoerciveDerivedCtx } from './types';

export function usePersonalCoerciveDossierJudgeDerived(ctx: PersonalCoerciveDerivedCtx, lane: Pick<
    ReturnType<typeof usePersonalCoerciveDerivedLaneCore>,
    | 'detentionJudgeEligibleDecisionId'
    | 'judgeDetentionStored'
    | 'judgeDetention'
    | 'detentionActive'
    | 'dossierCycleActive'
    | 'travelBanEnforced'
    | 'travelCycleActive'
    | 'executionPatchDiffers'
>, showTravelBanSection: boolean) {
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

    const {
        detentionJudgeEligibleDecisionId,
        judgeDetentionStored,
        judgeDetention,
        detentionActive,
        dossierCycleActive,
        travelBanEnforced,
        travelCycleActive,
        executionPatchDiffers,
    } = lane;

    const dossierLaneAnchored =
        dossierEffective.approved ||
        dossierPhaseEffective === 'handed_to_judge' ||
        dossierPhaseEffective === 'judge_decided' ||
        dossierPhaseEffective === 'detention_active' ||
        Boolean(String(detentionJudgeEligibleDecisionId ?? '').trim()) ||
        Boolean(String(executionData?.executive_detention_judge_decision_id ?? '').trim()) ||
        judgeDetentionStored === 'approved' ||
        judgeDetentionStored === 'rejected' ||
        detentionActive;

    const dossierExecutorPhaseComplete =
        !detentionLaneEnded &&
        dossierLaneAnchored &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            dossierPhaseEffective === 'judge_decided' ||
            dossierPhaseEffective === 'detention_active' ||
            (dossierEffective.approved &&
                !dossierEffective.pending &&
                !dossierEffective.rejected));

    const optionalRemainingProceduresUnlocked =
        optionalRemainingProceduresOpen ||
        travelCycleActive ||
        dossierCycleActive ||
        travelBanEnforced ||
        detentionActive ||
        dossierExecutorPhaseComplete;

    const showOptionalRemainingProceduresEntry = false;

    const showTravelBanInMainFlow = showTravelBanSection;

    const dossierPresentationGloballyAllowed = !employeeDetentionRestricted;

    const dossierAwaitingJudge =
        dossierExecutorPhaseComplete &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            (dossierEffective.approved && !dossierEffective.pending && !dossierEffective.rejected)) &&
        !dossierSync.followupBlock &&
        !dossierSync.blocksFieldwork &&
        (dossierSync.enforced || dossierEffective.approved) &&
        !detentionActive &&
        judgeDetention === null;

    const dossierIdle =
        !dossierExecutorPhaseComplete &&
        (detentionLaneEnded ||
            !dossierCycleActive ||
            (!dossierEffective.pending &&
                !dossierEffective.rejected &&
                !dossierEffective.approved &&
                !dossierEffective.alternative &&
                !detentionActive &&
                judgeDetention === null &&
                (dossierPhaseEffective === null || dossierPhaseEffective === undefined)));

    const judgeDecisionIdStored = String(
        executionDataEffective?.executive_detention_judge_decision_id ?? ''
    ).trim();

    const dossierShowStartPeriod =
        !detentionLaneEnded &&
        (judgeDetention === 'approved' || judgeDetentionStored === 'approved') &&
        (dossierPhaseEffective === 'judge_decided' ||
            dossierPhaseEffective === 'detention_active' ||
            judgeDetentionStored === 'approved') &&
        !detentionActive &&
        !judgeSync.blocksFieldwork &&
        !judgeSync.cycleSuperseded &&
        (judgeSync.enforced ||
            judgeDetentionStored === 'approved' ||
            Boolean(judgeDecisionIdStored));

    const dossierRequestPhaseActive =
        dossierEffective.pending ||
        dossierEffective.rejected ||
        dossierEffective.alternative ||
        dossierIdle;

    const showDossierPresentationCard =
        dossierPresentationGloballyAllowed &&
        !detentionLaneEnded &&
        dossierRequestPhaseActive;

    const dossierHasExpandablePanel =
        dossierEffective.pending ||
        dossierEffective.rejected ||
        dossierEffective.alternative;

    const dossierButtonDisabled = sendingKey === 'executive_dossier_presentation';

    const judgeRejectedResubmitVisible =
        judgeDetention === 'rejected' &&
        dossierPhaseEffective === 'judge_decided' &&
        Boolean(judgeDecisionIdStored) &&
        !judgeSync.cycleSuperseded &&
        !isExecutorRejectedAppealFollowupDismissed(judgeDecisionIdStored, allDecisionRows);
    const judgeCassationOverturnVisible =
        !detentionActive &&
        judgeDetention === 'approved' &&
        judgeDetentionStored === 'rejected' &&
        dossierPhaseEffective === 'judge_decided';
    const dossierHandedToJudgeStalled =
        dossierPhaseEffective === 'handed_to_judge' &&
        (Boolean(dossierSync.followupBlock) || dossierSync.blocksFieldwork) &&
        !detentionActive;
    const dossierJudgeLaneReady =
        dossierExecutorPhaseComplete &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            (dossierEffective.approved && !dossierEffective.pending && !dossierEffective.rejected)) &&
        !dossierSync.followupBlock &&
        !dossierSync.blocksFieldwork &&
        !detentionActive &&
        judgeDetention === null;
    const judgeApprovedAwaitingDetentionStart =
        !detentionActive &&
        !detentionLaneEnded &&
        (judgeDetention === 'approved' || judgeDetentionStored === 'approved') &&
        !judgeSync.blocksFieldwork &&
        !judgeSync.cycleSuperseded;
    const detentionPeriodActivePanel = detentionActive && !detentionLaneEnded;
    const judgeHasActionablePanel =
        dossierJudgeLaneReady ||
        dossierAwaitingJudge ||
        dossierShowStartPeriod ||
        judgeApprovedAwaitingDetentionStart ||
        detentionPeriodActivePanel ||
        dossierHandedToJudgeStalled ||
        Boolean(judgeSync.followupBlock) ||
        judgeRejectedResubmitVisible ||
        judgeCassationOverturnVisible;

    const executiveDetentionJudgeCardAllowed =
        !hideExecutiveDetentionJudgeCard || dossierExecutorPhaseComplete;
    const showJudgeDetentionCard =
        executiveDetentionJudgeCardAllowed &&
        !hideDossierJudgePresentation &&
        !employeeDetentionRestricted &&
        !detentionLaneEnded &&
        (dossierExecutorPhaseComplete || detentionActive) &&
        (judgeHasActionablePanel || detentionActive);

    const dossierPhaseSyncRef = React.useRef<string | null>(null);

    useEffect(() => {
        dossierPhaseSyncRef.current = null;
    }, [exId]);

    useEffect(() => {
        if (detentionLaneEnded || !exId) return;
        if (judgeDetention === 'approved' || judgeDetention === 'rejected') {
            if (!judgeHasActionablePanel) return;
            if (dossierPhaseEffective === null || dossierPhaseEffective === undefined) return;
            if (dossierPhaseEffective !== 'judge_decided' && dossierPhaseEffective !== 'detention_active') {
                if (dossierPhaseSyncRef.current === 'judge_decided') return;
                dossierPhaseSyncRef.current = 'judge_decided';
                persistExecutionMerge({ executive_dossier_phase: 'judge_decided' });
            }
            return;
        }
        if (
            dossierEffective.approved &&
            !dossierEffective.pending &&
            !dossierEffective.rejected &&
            dossierPhaseEffective !== 'handed_to_judge' &&
            dossierPhaseEffective !== 'judge_decided' &&
            dossierPhaseEffective !== 'detention_active'
        ) {
            if (dossierPhaseSyncRef.current === 'handed_to_judge') return;
            dossierPhaseSyncRef.current = 'handed_to_judge';
            const govId = findGoverningDossierDecisionId();
            persistExecutionMerge({
                executive_dossier_phase: 'handed_to_judge',
                ...(govId && !detentionJudgeEligibleDecisionId
                    ? { executive_detention_judge_eligible_decision_id: govId }
                    : {}),
            });
        }
    }, [
        detentionLaneEnded,
        detentionJudgeEligibleDecisionId,
        dossierEffective.approved,
        dossierEffective.pending,
        dossierEffective.rejected,
        dossierPhaseEffective,
        exId,
        findGoverningDossierDecisionId,
        judgeDetention,
        judgeHasActionablePanel,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (showJudgeDetentionCard) return;
        if (judgeDetailsOpen) setJudgeDetailsOpen(false);
    }, [judgeDetailsOpen, showJudgeDetentionCard]);

    useEffect(() => {
        if (!exId || isHistoricalMode || detentionLaneEnded) return;
        if (
            dossierExecutorPhaseComplete &&
            judgeDetention === null &&
            !detentionActive &&
            (dossierEffective.approved || dossierPhaseEffective === 'handed_to_judge')
        ) {
            return;
        }
        if (!dossierExecutorPhaseComplete || judgeHasActionablePanel) return;
        const resetPatch: Record<string, unknown> = {
            executive_dossier_phase: null,
            executive_detention_judge_outcome: null,
            executive_detention_judge_decision_id: null,
            executive_detention_judge_eligible_decision_id: null,
            executive_detention_judge_rejection_reason: null,
        };
        if (!executionPatchDiffers(resetPatch)) return;
        persistExecutionMerge(resetPatch);
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'executive_detention_judge',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setJudgeDetailsOpen(false);
        setLocalDecisionsTick((n) => n + 1);
    }, [
        activeDebtorKey,
        detentionActive,
        detentionLaneEnded,
        dossierEffective.approved,
        dossierExecutorPhaseComplete,
        dossierPhaseEffective,
        exId,
        executionPatchDiffers,
        isHistoricalMode,
        judgeHasActionablePanel,
        judgeDetention,
        persistExecutionMerge,
        primaryDebtorKey,
    ]);

    return {
        dossierLaneAnchored,
        dossierExecutorPhaseComplete,
        optionalRemainingProceduresUnlocked,
        showOptionalRemainingProceduresEntry,
        showTravelBanInMainFlow,
        dossierPresentationGloballyAllowed,
        dossierAwaitingJudge,
        dossierIdle,
        judgeDecisionIdStored,
        dossierShowStartPeriod,
        dossierRequestPhaseActive,
        showDossierPresentationCard,
        dossierHasExpandablePanel,
        dossierButtonDisabled,
        judgeRejectedResubmitVisible,
        judgeCassationOverturnVisible,
        dossierHandedToJudgeStalled,
        dossierJudgeLaneReady,
        judgeApprovedAwaitingDetentionStart,
        detentionPeriodActivePanel,
        judgeHasActionablePanel,
        executiveDetentionJudgeCardAllowed,
        showJudgeDetentionCard,
        dossierPhaseSyncRef,
    };
}
