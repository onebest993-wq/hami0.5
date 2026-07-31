import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import { useCriminalStore, type CriminalCase } from '../criminalStore';
import {
    getCurrentJourneyNode,
    getJourneyBranchTracks,
    repairSameCourtRemandJourneyNodes,
    type JourneyBranchTrack,
    type JourneyNode,
} from '../stageJourneyRuntimeCore';
import { syncStoredStageFromJourneyCaseStage } from '../criminalStageRuntimeCore';
import { isUnderInterventionReview } from '../cassationEngine';
import {
    investigationStatementsMutationBlocked,
    otherEvidenceMutationBlocked,
} from '../investigationDefendantPurge';
import { resolveCanCreateDecisionsOrRequests } from '../criminalDashboardStageAccess';

export type UseCriminalJourneyStageAccessOrchestratorParams = {
    id: string;
    rawCase: CriminalCase | null;
    criminalCase: CriminalCase;
    stage: string;
    caseStage: CaseStage;
    isInvestigationPhase: boolean;
    isInvestigationDossierSealed: boolean;
    isInvestigationLocked: boolean;
    isDashboardReadOnly: boolean;
    isTrialCourtStage: boolean;
    isJuvenileTrial: boolean;
    isPrejudicialPostponed: boolean;
    selectedJourneyBranchId: string;
    setSelectedNodeFilter: Dispatch<SetStateAction<string>>;
    setSelectedPartyFilterId: Dispatch<SetStateAction<string>>;
    setSelectedJourneyBranchId: Dispatch<SetStateAction<string>>;
};

export type UseCriminalJourneyStageAccessOrchestratorResult = {
    stageJourney: JourneyNode[];
    journeyBranchTracks: JourneyBranchTrack[];
    activeJourneyBranch: JourneyBranchTrack | null;
    selectedJourneyNode: JourneyNode | null;
    activeJourneyStage: CaseStage;
    effectiveUiStage: CaseStage;
    showTrialsTab: boolean;
    isEffectiveTrialCourtStage: boolean;
    showJourneyReferralButton: boolean;
    isHistoricalNodeView: boolean;
    isInterventionReview: boolean;
    isCassationFilterReadOnly: boolean;
    isTimelineArchiveReadOnly: boolean;
    isPrejudicialFrozen: boolean;
    isInvestigationMaterialReadOnly: boolean;
    canCreateDecisionsOrRequests: boolean;
    isStatementsTabReadOnly: boolean;
    isOtherEvidenceReadOnly: boolean;
    isDecisionsTabMaterialReadOnly: boolean;
};

/**
 * رحلة القضية (stageJourney) + إصلاحها الذاتي + كل أعلام القراءة-فقط/الصلاحية المشتقة منها
 * ومن حالة الإضبارة (تجميد سابق لأوانه، تدخل تمييزي، ختم تحقيق...).
 * مستخرَج من الـ runtime — الفلاتر الخام (selectedNodeFilter/selectedPartyFilterId/selectedJourneyBranchId)
 * تبقى في useCriminalJourneyFilterOrchestrator.
 */
export function useCriminalJourneyStageAccessOrchestrator({
    id,
    rawCase,
    criminalCase,
    stage: _stage,
    caseStage,
    isInvestigationPhase,
    isInvestigationDossierSealed,
    isInvestigationLocked,
    isDashboardReadOnly,
    isTrialCourtStage,
    isJuvenileTrial,
    isPrejudicialPostponed,
    selectedJourneyBranchId,
    setSelectedNodeFilter,
    setSelectedPartyFilterId,
    setSelectedJourneyBranchId,
}: UseCriminalJourneyStageAccessOrchestratorParams): UseCriminalJourneyStageAccessOrchestratorResult {
    const stageJourney = useMemo(() => {
        const raw = Array.isArray(rawCase?.stageJourney) ? rawCase.stageJourney : [];
        return raw.length ? repairSameCourtRemandJourneyNodes(raw) : [];
    }, [rawCase?.stageJourney]);

    useEffect(() => {
        if (!id) return;
        const raw = rawCase?.stageJourney;
        if (!Array.isArray(raw) || raw.length === 0) return;

        let cancelled = false;
        const runRepair = () => {
            if (cancelled) return;
            const repaired = repairSameCourtRemandJourneyNodes(raw);
            const currentNode = getCurrentJourneyNode(repaired);
            const resolvedStage = currentNode?.stage ?? rawCase?.caseStage;
            const stored = resolvedStage
                ? syncStoredStageFromJourneyCaseStage(resolvedStage, rawCase?.basics?.stage)
                : rawCase?.basics?.stage;
            const journeySignature = (nodes: typeof raw) =>
                nodes
                    .map(
                        (n) =>
                            `${n.id}:${n.stage}:${n.status}:${String(n.startedAt ?? '')}:${String(n.endedAt ?? '')}`,
                    )
                    .join('|');
            const journeyChanged = journeySignature(repaired) !== journeySignature(raw);
            const stageChanged =
                Boolean(resolvedStage) &&
                (rawCase?.caseStage !== resolvedStage || rawCase?.basics?.stage !== stored);
            if (!journeyChanged && !stageChanged) return;
            useCriminalStore.setState((state) => {
                const target = state.casesById[id];
                if (!target) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [id]: {
                            ...target,
                            stageJourney: repaired,
                            ...(resolvedStage
                                ? {
                                      caseStage: resolvedStage,
                                      basics: { ...target.basics, stage: stored ?? target.basics?.stage },
                                  }
                                : {}),
                        },
                    },
                };
            });
        };

        if (typeof requestIdleCallback !== 'undefined') {
            const handle = requestIdleCallback(runRepair, { timeout: 2_500 });
            return () => {
                cancelled = true;
                cancelIdleCallback(handle);
            };
        }
        const timer = window.setTimeout(runRepair, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [id, rawCase?.stageJourney, rawCase?.caseStage, rawCase?.basics?.stage]);

    const journeyBranchTracks = useMemo(() => getJourneyBranchTracks(stageJourney), [stageJourney]);
    const currentJourneyNode = useMemo(
        () => getCurrentJourneyNode(stageJourney, selectedJourneyBranchId),
        [stageJourney, selectedJourneyBranchId],
    );
    const activeJourneyBranch = useMemo(
        () => journeyBranchTracks.find((b) => b.branchId === selectedJourneyBranchId) ?? null,
        [journeyBranchTracks, selectedJourneyBranchId],
    );
    useEffect(() => {
        setSelectedNodeFilter('');
        setSelectedPartyFilterId('');
        setSelectedJourneyBranchId('');
    }, [id, currentJourneyNode?.id, setSelectedNodeFilter, setSelectedPartyFilterId, setSelectedJourneyBranchId]);

    const selectedJourneyNode = currentJourneyNode;

    const activeJourneyStage = currentJourneyNode?.stage ?? caseStage;
    const effectiveUiStage = activeJourneyStage;
    const showTrialsTab = effectiveUiStage === 'misdemeanor' || effectiveUiStage === 'felony';
    const isEffectiveTrialCourtStage = showTrialsTab;
    const showJourneyReferralButton =
        activeJourneyStage === 'misdemeanor' ||
        activeJourneyStage === 'felony' ||
        (isJuvenileTrial && isTrialCourtStage);

    const isHistoricalNodeView = false;
    const isInterventionReview = isUnderInterventionReview(criminalCase);
    const isCassationFilterReadOnly = selectedJourneyNode?.isCassationFilterNode === true;
    const isTimelineArchiveReadOnly =
        isHistoricalNodeView || isDashboardReadOnly || isCassationFilterReadOnly;
    const isPrejudicialFrozen =
        isPrejudicialPostponed || currentJourneyNode?.phaseOverlay === 'frozen_prejudicial';
    const isInvestigationMaterialReadOnly =
        isInvestigationPhase &&
        (isInvestigationDossierSealed || isPrejudicialFrozen || isInvestigationLocked);
    const canCreateDecisionsOrRequests = resolveCanCreateDecisionsOrRequests({
        isDashboardReadOnly,
        isCassationFilterReadOnly,
        isHistoricalNodeView,
        isInterventionReview,
        isInvestigationPhase,
        isInvestigationDossierSealed,
        isInvestigationLocked,
        isPrejudicialFrozen,
    });
    const isStatementsTabReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        (isInvestigationPhase && investigationStatementsMutationBlocked(criminalCase));
    const isOtherEvidenceReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        otherEvidenceMutationBlocked(criminalCase);
    const isDecisionsTabMaterialReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        isInvestigationMaterialReadOnly;

    return {
        stageJourney,
        journeyBranchTracks,
        activeJourneyBranch,
        selectedJourneyNode,
        activeJourneyStage,
        effectiveUiStage,
        showTrialsTab,
        isEffectiveTrialCourtStage,
        showJourneyReferralButton,
        isHistoricalNodeView,
        isInterventionReview,
        isCassationFilterReadOnly,
        isTimelineArchiveReadOnly,
        isPrejudicialFrozen,
        isInvestigationMaterialReadOnly,
        canCreateDecisionsOrRequests,
        isStatementsTabReadOnly,
        isOtherEvidenceReadOnly,
        isDecisionsTabMaterialReadOnly,
    };
}
