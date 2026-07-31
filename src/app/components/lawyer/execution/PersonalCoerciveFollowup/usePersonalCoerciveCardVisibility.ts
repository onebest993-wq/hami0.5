import { useEffect, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { PersonalCoerciveSubtypeOutcome } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import type { HiddenPersonalCoerciveRequestKey } from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';

export interface UsePersonalCoerciveCardVisibilityOptions {
    detentionJudgeEligibleDecisionId: string | null | undefined;
    executionData: ExecutionFile | null;
    judgeDetentionStored: 'approved' | 'rejected' | null;
    detentionActive: boolean;
    dossier: PersonalCoerciveSubtypeOutcome;
    detentionLaneEnded: boolean;
    dossierPhase: ExecutionFile['executive_dossier_phase'] | null;
    optionalRemainingProceduresOpen: boolean;
    travelCycleActive: boolean;
    dossierCycleActive: boolean;
    travelBanEnforced: boolean;
    earnerFinancialPersonalCoerciveActive: boolean;
    embeddedHiddenPath?: HiddenPersonalCoerciveRequestKey;
    showTravelBanSection: boolean;
    hideDossierJudgePresentation: boolean;
    employeeDetentionRestricted: boolean;
    dossierSync: PersonalCoerciveAppealSyncView;
    judgeDetention: 'approved' | 'rejected' | null;
    judgeSync: PersonalCoerciveAppealSyncView;
    allDecisionRows: Record<string, unknown>[];
    hideExecutiveDetentionJudgeCard: boolean;
    sendingKey: string | null;
    canSubmitExecutiveDetention: boolean;
    exId: string;
    isHistoricalMode: boolean;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    findGoverningDossierDecisionId: () => string | null;
    executionPatchDiffers: (patch: Record<string, unknown> | null | undefined) => boolean;
    judgeDetailsOpen: boolean;
    setJudgeDetailsOpen: (v: boolean) => void;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
}

/**
 * بانتظار قرار قاضي البداءة — بوابات إظهار البطاقات المتبقية (منع سفر/عرض إضبارة/قرار القاضي)
 * ومزامنة مرحلة الإضبارة التنفيذية (`executive_dossier_phase`) مع تقدّم دورة القرارات.
 */
export function usePersonalCoerciveCardVisibility({
    detentionJudgeEligibleDecisionId,
    executionData,
    judgeDetentionStored,
    detentionActive,
    dossier,
    detentionLaneEnded,
    dossierPhase,
    optionalRemainingProceduresOpen,
    travelCycleActive,
    dossierCycleActive,
    travelBanEnforced,
    earnerFinancialPersonalCoerciveActive,
    embeddedHiddenPath,
    showTravelBanSection,
    hideDossierJudgePresentation,
    employeeDetentionRestricted,
    dossierSync,
    judgeDetention,
    judgeSync,
    allDecisionRows,
    hideExecutiveDetentionJudgeCard,
    sendingKey,
    canSubmitExecutiveDetention,
    exId,
    isHistoricalMode,
    persistExecutionMerge,
    activeDebtorKey,
    primaryDebtorKey,
    findGoverningDossierDecisionId,
    executionPatchDiffers,
    judgeDetailsOpen,
    setJudgeDetailsOpen,
    setLocalDecisionsTick,
}: UsePersonalCoerciveCardVisibilityOptions) {
    const dossierLaneAnchored =
        dossier.approved ||
        Boolean(String(detentionJudgeEligibleDecisionId ?? '').trim()) ||
        Boolean(String(executionData?.executive_detention_judge_decision_id ?? '').trim()) ||
        judgeDetentionStored === 'approved' ||
        judgeDetentionStored === 'rejected' ||
        detentionActive;

    const dossierExecutorPhaseComplete =
        !detentionLaneEnded &&
        dossierLaneAnchored &&
        dossierPhase !== null &&
        dossierPhase !== undefined &&
        (dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active');

    const optionalRemainingProceduresUnlocked =
        optionalRemainingProceduresOpen ||
        travelCycleActive ||
        dossierCycleActive ||
        travelBanEnforced ||
        detentionActive ||
        dossierExecutorPhaseComplete;

    const showOptionalRemainingProceduresEntry =
        earnerFinancialPersonalCoerciveActive &&
        !embeddedHiddenPath &&
        !optionalRemainingProceduresUnlocked;

    const showTravelBanInMainFlow =
        showTravelBanSection &&
        (!earnerFinancialPersonalCoerciveActive || optionalRemainingProceduresUnlocked);

    const dossierPresentationGloballyAllowed =
        !hideDossierJudgePresentation && !employeeDetentionRestricted;

    const dossierAwaitingJudge =
        dossierExecutorPhaseComplete &&
        dossierPhase === 'handed_to_judge' &&
        !dossierSync.followupBlock &&
        !dossierSync.blocksFieldwork &&
        dossierSync.enforced &&
        !detentionActive &&
        judgeDetention === null;

    const dossierIdle =
        !dossierExecutorPhaseComplete &&
        (detentionLaneEnded ||
            !dossierCycleActive ||
            (!dossier.pending &&
                !dossier.rejected &&
                !dossier.approved &&
                !dossier.alternative &&
                !detentionActive &&
                judgeDetention === null &&
                (dossierPhase === null || dossierPhase === undefined)));

    const dossierShowStartPeriod =
        !detentionLaneEnded &&
        judgeDetention === 'approved' &&
        (dossierPhase === 'judge_decided' || dossierPhase === 'detention_active') &&
        !detentionActive &&
        judgeSync.enforced &&
        !judgeSync.blocksFieldwork &&
        !judgeSync.cycleSuperseded;

    const showDossierPresentationCard =
        dossierPresentationGloballyAllowed &&
        (!earnerFinancialPersonalCoerciveActive || optionalRemainingProceduresUnlocked) &&
        !dossierExecutorPhaseComplete &&
        (dossier.pending ||
            dossier.rejected ||
            dossier.alternative ||
            dossierIdle ||
            (dossier.approved && Boolean(dossierSync.followupBlock)));

    const dossierHasExpandablePanel =
        dossier.pending ||
        dossier.rejected ||
        dossier.alternative ||
        Boolean(dossier.approved && dossierSync.followupBlock);

    const dossierButtonDisabled =
        !canSubmitExecutiveDetention || sendingKey === 'executive_dossier_presentation';

    const judgeDecisionIdStored = String(
        executionData?.executive_detention_judge_decision_id ?? ''
    ).trim();
    const judgeRejectedResubmitVisible =
        judgeDetention === 'rejected' &&
        dossierPhase === 'judge_decided' &&
        Boolean(judgeDecisionIdStored) &&
        !judgeSync.cycleSuperseded &&
        !isExecutorRejectedAppealFollowupDismissed(judgeDecisionIdStored, allDecisionRows);
    const judgeCassationOverturnVisible =
        !detentionActive &&
        judgeDetention === 'approved' &&
        judgeDetentionStored === 'rejected' &&
        dossierPhase === 'judge_decided';
    const dossierHandedToJudgeStalled =
        dossierPhase === 'handed_to_judge' &&
        (Boolean(dossierSync.followupBlock) || dossierSync.blocksFieldwork) &&
        !detentionActive;
    const judgeHasActionablePanel =
        dossierAwaitingJudge ||
        dossierShowStartPeriod ||
        dossierHandedToJudgeStalled ||
        Boolean(judgeSync.followupBlock) ||
        judgeRejectedResubmitVisible ||
        judgeCassationOverturnVisible;

    const showJudgeDetentionCard =
        !hideExecutiveDetentionJudgeCard &&
        !hideDossierJudgePresentation &&
        !employeeDetentionRestricted &&
        !detentionLaneEnded &&
        dossierExecutorPhaseComplete &&
        judgeHasActionablePanel;

    const dossierPhaseSyncRef = useRef<string | null>(null);

    useEffect(() => {
        dossierPhaseSyncRef.current = null;
    }, [exId]);

    useEffect(() => {
        if (detentionLaneEnded || !exId) return;
        if (judgeDetention === 'approved' || judgeDetention === 'rejected') {
            if (!judgeHasActionablePanel) return;
            if (dossierPhase !== 'judge_decided' && dossierPhase !== 'detention_active') {
                if (dossierPhaseSyncRef.current === 'judge_decided') return;
                dossierPhaseSyncRef.current = 'judge_decided';
                persistExecutionMerge({ executive_dossier_phase: 'judge_decided' });
            }
            return;
        }
        if (
            dossier.approved &&
            !dossier.pending &&
            !dossier.rejected &&
            dossierPhase !== 'handed_to_judge' &&
            dossierPhase !== 'judge_decided' &&
            dossierPhase !== 'detention_active'
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
        dossier.approved,
        dossier.pending,
        dossier.rejected,
        dossierPhase,
        exId,
        findGoverningDossierDecisionId,
        judgeDetention,
        judgeHasActionablePanel,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (showJudgeDetentionCard) return;
        if (judgeDetailsOpen) setJudgeDetailsOpen(false);
    }, [judgeDetailsOpen, showJudgeDetentionCard, setJudgeDetailsOpen]);

    useEffect(() => {
        if (!exId || isHistoricalMode || detentionLaneEnded) return;
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
        detentionLaneEnded,
        dossierExecutorPhaseComplete,
        exId,
        executionPatchDiffers,
        isHistoricalMode,
        judgeHasActionablePanel,
        persistExecutionMerge,
        primaryDebtorKey,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
    ]);

    return {
        showOptionalRemainingProceduresEntry,
        showTravelBanInMainFlow,
        dossierAwaitingJudge,
        dossierIdle,
        dossierShowStartPeriod,
        showDossierPresentationCard,
        dossierHasExpandablePanel,
        dossierButtonDisabled,
        judgeDecisionIdStored,
        judgeRejectedResubmitVisible,
        dossierHandedToJudgeStalled,
        showJudgeDetentionCard,
    };
}
