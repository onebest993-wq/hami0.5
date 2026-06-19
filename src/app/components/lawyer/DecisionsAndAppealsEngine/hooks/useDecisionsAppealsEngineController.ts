import { newEventId } from '../utils';
import { useDecisionDispatcher } from '@/app/hooks/useDecisionDispatcher';
import { useDecisionsAppealsEngineStorage } from '../hooks/useDecisionsAppealsEngineStorage';
import { useDecisionsAppealsMutations } from '../hooks/useDecisionsAppealsMutations';
import { useDecisionsAppealsHubLists } from '../hooks/useDecisionsAppealsHubLists';
import { useDecisionsAppealsAppealRenderers } from '../hooks/useDecisionsAppealsAppealRenderers';
import { useDecisionsAppealsHubUiState } from '../hooks/useDecisionsAppealsHubUiState';
import { useDecisionsAppealsAppealPolicies } from '../hooks/useDecisionsAppealsAppealPolicies';
import { buildDecisionsAppealsCardPropBundles } from '../engine/buildDecisionsAppealsCardPropBundles';
import type { DecisionsAndAppealsEngineProps } from '../engine/decisionsEngineTypes';
import type { DecisionsAppealsHubViewProps } from '../components/DecisionsAppealsHubView';

export function useDecisionsAppealsEngineController({
    executionId,
    onTimelineUpdate,
    evictionExecutorWorkflow,
    dispatcherHub,
    bootHubTab,
    decisionsScrollToIdOnBoot,
    appealsScrollToIdOnBoot,
    isHistoricalMode = false,
    getMilestoneTimelineSnapshot,
}: DecisionsAndAppealsEngineProps) {
    const executionDataForSync = dispatcherHub?.executionData ?? null;

    const storage = useDecisionsAppealsEngineStorage({
        executionId,
        executionDataForSync: executionDataForSync as Record<string, unknown> | null,
    });

    const { resolveDecision } = useDecisionDispatcher({
        executionId,
        executionData: dispatcherHub?.executionData ?? null,
        seizedAssets: dispatcherHub?.seizedAssets ?? [],
        seizureDraftsByDecisionId: dispatcherHub?.seizureDraftsByDecisionId,
        persistExecutionMerge: dispatcherHub?.persistExecutionMerge ?? (() => {}),
        pushTimeline: dispatcherHub?.pushTimeline ?? (() => {}),
        nextTimelineId: dispatcherHub?.nextTimelineId ?? (() => newEventId()),
        syncSeizedAssets: dispatcherHub?.syncSeizedAssets,
        syncSeizureDrafts: dispatcherHub?.syncSeizureDrafts,
        syncActiveCoerciveActions: dispatcherHub?.syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        getTimelineSnapshot:
            dispatcherHub?.getTimelineSnapshot ?? getMilestoneTimelineSnapshot,
    });

    const ui = useDecisionsAppealsHubUiState({
        isHistoricalMode,
        bootHubTab,
        decisionsScrollToIdOnBoot,
        appealsScrollToIdOnBoot,
        domainVisibleDecisionsLength: storage.domainVisibleDecisions.length,
        setDecisions: storage.setDecisions,
        persistDecisionsToStorage: storage.persistDecisionsToStorage,
    });

    const policies = useDecisionsAppealsAppealPolicies();

    const mutations = useDecisionsAppealsMutations({
        executionId,
        decisions: storage.decisions,
        setDecisions: storage.setDecisions,
        persistDecisionsToStorage: storage.persistDecisionsToStorage,
        appealPerspective: storage.appealPerspective,
        reloadFromStorage: storage.reloadFromStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        resolveDecision,
        hubNoteById: ui.hubNoteById,
        setHubNoteById: ui.setHubNoteById,
        setDecisionsHubTab: ui.setDecisionsHubTab,
        goToAppealsWithScroll: ui.goToAppealsWithScroll,
        newTitle: ui.newTitle,
        newBody: ui.newBody,
        newDate: ui.newDate,
        resetAddDecisionForm: ui.resetAddDecisionForm,
        setShowAddModal: ui.setShowAddModal,
    });

    const hubLists = useDecisionsAppealsHubLists({
        domainVisibleDecisions: storage.domainVisibleDecisions,
        appealPerspective: storage.appealPerspective,
        requestNeedsExecutorOutcome: policies.requestNeedsExecutorOutcome,
        previousFilter: ui.previousFilter,
        previousProponentFilter: ui.previousProponentFilter,
        appealsProponentFilter: ui.appealsProponentFilter,
        setPreviousProponentFilter: ui.setPreviousProponentFilter,
        setAppealsProponentFilter: ui.setAppealsProponentFilter,
    });

    const renderers = useDecisionsAppealsAppealRenderers({
        appealPerspective: storage.appealPerspective,
        decisions: storage.decisions,
        decisionsHubTab: ui.decisionsHubTab,
        setAppealDetailDecision: ui.setAppealDetailDecision,
        setDecisionsHubTab: ui.setDecisionsHubTab,
        goToAppealsWithScroll: ui.goToAppealsWithScroll,
        requestNeedsExecutorOutcome: policies.requestNeedsExecutorOutcome,
        getAppealStatus: policies.getAppealStatus,
        transitionAppealWorkflow: mutations.transitionAppealWorkflow,
        commitExecutorSideAppealEntry: mutations.commitExecutorSideAppealEntry,
        applyWaiveInitialAppeal: mutations.applyWaiveInitialAppeal,
        applyCassationCourtDecision: mutations.applyCassationCourtDecision,
        applyGrievanceCourtOutcome: mutations.applyGrievanceCourtOutcome,
        applyWaiveCassationAfterDebtorGrievance: mutations.applyWaiveCassationAfterDebtorGrievance,
        patchDecisionRow: mutations.patchDecisionRow,
        logAppealTimeline: mutations.logAppealTimeline,
        tamyeezNumberDraftById: ui.tamyeezNumberDraftById,
        setTamyeezNumberDraftById: ui.setTamyeezNumberDraftById,
        tamyeezEditOpenById: ui.tamyeezEditOpenById,
        setTamyeezEditOpenById: ui.setTamyeezEditOpenById,
    });

    const { decisionCardProps, appealWorkflowCardProps } = buildDecisionsAppealsCardPropBundles({
        decisions: storage.decisions,
        decisionsHubTab: ui.decisionsHubTab,
        dispatcherHub,
        executionId,
        appealPerspective: storage.appealPerspective,
        requestNeedsExecutorOutcome: policies.requestNeedsExecutorOutcome,
        renderers,
        hubNoteById: ui.hubNoteById,
        setHubNoteById: ui.setHubNoteById,
        handleExecutorResolveById: mutations.handleExecutorResolveById,
        goToAppealsWithScroll: ui.goToAppealsWithScroll,
        canShowAppealInitialForDecision: policies.canShowAppealInitialForDecision,
        patchDecisionRow: mutations.patchDecisionRow,
        logAppealTimeline: mutations.logAppealTimeline,
        handleDeleteDecision: mutations.handleDeleteDecision,
        handleArchiveDecision: mutations.handleArchiveDecision,
        setDecisionsHubTab: ui.setDecisionsHubTab,
        transitionAppealWorkflow: mutations.transitionAppealWorkflow,
    });

    const hubView: DecisionsAppealsHubViewProps = {
        isHistoricalMode,
        decisions: storage.decisions,
        decisionsHubTab: ui.decisionsHubTab,
        setDecisionsHubTab: ui.setDecisionsHubTab,
        setShowAddModal: ui.setShowAddModal,
        decisionBtnPrimary: renderers.DECISION_BTN_PRIMARY,
        archivePendingDecisions: hubLists.archivePendingDecisions,
        archiveSettledDecisions: hubLists.archiveSettledDecisions,
        archivedDecisions: hubLists.archivedDecisions,
        filteredPreviousSettledDecisions: hubLists.filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions: hubLists.filteredAppealsHubDecisions,
        appealsHubDecisions: hubLists.appealsHubDecisions,
        previousFilter: ui.previousFilter,
        setPreviousFilter: ui.setPreviousFilter,
        previousHubFilterOptions: hubLists.previousHubFilterOptions,
        previousProponentFilter: ui.previousProponentFilter,
        setPreviousProponentFilter: ui.setPreviousProponentFilter,
        appealsHubFilterOptions: hubLists.appealsHubFilterOptions,
        appealsProponentFilter: ui.appealsProponentFilter,
        setAppealsProponentFilter: ui.setAppealsProponentFilter,
        decisionCardProps,
        appealWorkflowCardProps,
    };

    return {
        hubView,
        addModal: {
            showAddModal: ui.showAddModal,
            setShowAddModal: ui.setShowAddModal,
            resetAddDecisionForm: ui.resetAddDecisionForm,
            newTitle: ui.newTitle,
            setNewTitle: ui.setNewTitle,
            newDate: ui.newDate,
            setNewDate: ui.setNewDate,
            newBody: ui.newBody,
            setNewBody: ui.setNewBody,
            handleAddDecision: mutations.handleAddDecision,
            decisionBtnPrimaryWFull: renderers.DECISION_BTN_PRIMARY_WFULL,
        },
        appealDetailModal: {
            appealDetailDecision: ui.appealDetailDecision,
            setAppealDetailDecision: ui.setAppealDetailDecision,
            goToAppealsWithScroll: ui.goToAppealsWithScroll,
            decisionBtnPrimaryWFull: renderers.DECISION_BTN_PRIMARY_WFULL,
        },
    };
}
