import type React from 'react';
import type { EvictionFieldProceduresPanelProps } from '../../types';
import type { useEvictionFieldPanelState } from '../useEvictionFieldPanelState';
import type { useEvictionFieldDecisions } from '../useEvictionFieldDecisions';
import type { useEvictionFieldActions } from '../useEvictionFieldActions';
import type { EvictionDecisionRow } from './evictionDecisionRowTypes';

export type EvictionBranchRenderersCtx = {
    locked: EvictionFieldProceduresPanelProps['locked'];
    executionData: EvictionFieldProceduresPanelProps['executionData'];
    tryOpenPendingCustodianDetails: EvictionFieldProceduresPanelProps['tryOpenPendingCustodianDetails'];
    saveJudicialCustodianDetails: EvictionFieldProceduresPanelProps['saveJudicialCustodianDetails'];
    openPoliceAssistanceDetails: EvictionFieldProceduresPanelProps['openPoliceAssistanceDetails'];
    savePoliceAssistance: EvictionFieldProceduresPanelProps['savePoliceAssistance'];
    saveBreakInventoryLedger: EvictionFieldProceduresPanelProps['saveBreakInventoryLedger'];
    finalizeBreakInventoryRequest: EvictionFieldProceduresPanelProps['finalizeBreakInventoryRequest'];
    isMaritalFurnitureClaim: boolean;
    maritalFurnitureItems: NonNullable<EvictionFieldProceduresPanelProps['maritalFurnitureItems']>;
    saveMaritalFurnitureDeliveryInventory: EvictionFieldProceduresPanelProps['saveMaritalFurnitureDeliveryInventory'];
    policeBtnRef: ReturnType<typeof useEvictionFieldPanelState>['policeBtnRef'];
    scheduleDraftByDecisionId: ReturnType<typeof useEvictionFieldPanelState>['scheduleDraftByDecisionId'];
    setScheduleDraftByDecisionId: ReturnType<typeof useEvictionFieldPanelState>['setScheduleDraftByDecisionId'];
    scheduleSavingByDecisionId: ReturnType<typeof useEvictionFieldPanelState>['scheduleSavingByDecisionId'];
    setScheduleSavingByDecisionId: ReturnType<typeof useEvictionFieldPanelState>['setScheduleSavingByDecisionId'];
    linkFieldVisitToAppointments: ReturnType<typeof useEvictionFieldPanelState>['linkFieldVisitToAppointments'];
    setLinkFieldVisitToAppointments: ReturnType<typeof useEvictionFieldPanelState>['setLinkFieldVisitToAppointments'];
    inlineExpandedByBranch: ReturnType<typeof useEvictionFieldPanelState>['inlineExpandedByBranch'];
    decisionsExecId: ReturnType<typeof useEvictionFieldDecisions>['decisionsExecId'];
    decisions: ReturnType<typeof useEvictionFieldDecisions>['decisions'];
    toast: ReturnType<typeof useEvictionFieldDecisions>['toast'];
    resolvedExistingJudicialCustodians: ReturnType<
        typeof useEvictionFieldDecisions
    >['resolvedExistingJudicialCustodians'];
    appealSync: ReturnType<typeof useEvictionFieldDecisions>['appealSync'];
    syncForBranch: ReturnType<typeof useEvictionFieldDecisions>['syncForBranch'];
    EVICTION_BRANCH_KEYS: ReturnType<typeof useEvictionFieldActions>['EVICTION_BRANCH_KEYS'];
    branchFollowupBlocked: ReturnType<typeof useEvictionFieldActions>['branchFollowupBlocked'];
    branchAppealCycleSuperseded: ReturnType<typeof useEvictionFieldActions>['branchAppealCycleSuperseded'];
    resolvePanelExecutionId: ReturnType<typeof useEvictionFieldActions>['resolvePanelExecutionId'];
    openAppeals: ReturnType<typeof useEvictionFieldActions>['openAppeals'];
    isBranchWorkflowComplete: ReturnType<typeof useEvictionFieldActions>['isBranchWorkflowComplete'];
    renderBranchExecutorActionsStrip: ReturnType<
        typeof useEvictionFieldActions
    >['renderBranchExecutorActionsStrip'];
    renderAppealSyncFollowup: ReturnType<typeof useEvictionFieldActions>['renderAppealSyncFollowup'];
    renderFollowupBlockStrip: ReturnType<typeof useEvictionFieldActions>['renderFollowupBlockStrip'];
    renderPendingDecisionStrip: ReturnType<typeof useEvictionFieldActions>['renderPendingDecisionStrip'];
    renderRejectedBranchNotice: ReturnType<typeof useEvictionFieldActions>['renderRejectedBranchNotice'];
    isBranchInProgress: ReturnType<typeof useEvictionFieldActions>['isBranchInProgress'];
    collapseBranchPanel: ReturnType<typeof useEvictionFieldActions>['collapseBranchPanel'];
    renderRowFollowupBlock: (row: Record<string, unknown>) => React.ReactNode;
};
