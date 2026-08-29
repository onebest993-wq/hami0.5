import React from 'react';
import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import type { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
import type { useEvictionFieldActions } from './useEvictionFieldActions';
import { buildArabicDateLabel, buildArabicTimeLabel } from './branchRenderers/arabicDateLabels';
import type { EvictionBranchRenderersCtx } from './branchRenderers/evictionBranchRenderersCtx';
import { createRenderFieldVisitInline } from './branchRenderers/createRenderFieldVisitInline';
import {
    createFindActiveApprovedIncompleteRow,
    createResolveFieldVisitScheduleRow,
    createRenderInlineDecision,
} from './branchRenderers/createRenderInlineDecision';
import {
    createRenderEvictionBranchPanelBody,
    createRenderBranchChevron,
} from './branchRenderers/createRenderEvictionBranchPanelBody';

/** Thin composer — branch JSX factories live under hooks/branchRenderers/. */
export function useEvictionFieldBranchRenderers(
    props: EvictionFieldProceduresPanelProps,
    state: ReturnType<typeof useEvictionFieldPanelState>,
    decisionsApi: ReturnType<typeof useEvictionFieldDecisions>,
    actions: ReturnType<typeof useEvictionFieldActions>,
) {
    const {
        locked,
        executionData = null,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianDetails,
        openPoliceAssistanceDetails,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim = false,
        maritalFurnitureItems = [],
        saveMaritalFurnitureDeliveryInventory,
    } = props;

    const {
        policeBtnRef,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        inlineExpandedByBranch,
    } = state;

    const {
        decisionsExecId,
        decisions,
        toast,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    } = decisionsApi;

    const {
        EVICTION_BRANCH_KEYS,
        branchFollowupBlocked,
        branchAppealCycleSuperseded,
        resolvePanelExecutionId,
        openAppeals,
        isBranchWorkflowComplete,
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        isBranchInProgress,
        collapseBranchPanel,
    } = actions;

    const renderRowFollowupBlock = React.useCallback(
        (row: Record<string, unknown>) => {
            const branch = inferExecutorApprovalDecisionType({
                title: String((row as { title?: string }).title || ''),
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: (row as { evictionWorkflowKey?: EvictionExecutorWorkflowKey })
                    .evictionWorkflowKey,
            });
            if (!branch || !EVICTION_BRANCH_KEYS.includes(branch as (typeof EVICTION_BRANCH_KEYS)[number])) {
                return null;
            }
            const sync = syncForBranch(branch);
            if (!sync.followupBlock || sync.decisionId !== String((row as { id?: string }).id || '').trim()) {
                return null;
            }
            const panel = renderAppealSyncFollowup(sync);
            if (!panel) return null;
            return <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">{panel}</div>;
        },
        [EVICTION_BRANCH_KEYS, renderAppealSyncFollowup, syncForBranch],
    );

    const ctx: EvictionBranchRenderersCtx = {
        locked,
        executionData,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianDetails,
        openPoliceAssistanceDetails,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim,
        maritalFurnitureItems,
        saveMaritalFurnitureDeliveryInventory,
        policeBtnRef,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        inlineExpandedByBranch,
        decisionsExecId,
        decisions,
        toast,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
        EVICTION_BRANCH_KEYS,
        branchFollowupBlocked,
        branchAppealCycleSuperseded,
        resolvePanelExecutionId,
        openAppeals,
        isBranchWorkflowComplete,
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        isBranchInProgress,
        collapseBranchPanel,
        renderRowFollowupBlock,
    };

    const findActiveApprovedIncompleteRow = createFindActiveApprovedIncompleteRow(ctx);
    const resolveFieldVisitScheduleRow = createResolveFieldVisitScheduleRow(
        ctx,
        findActiveApprovedIncompleteRow,
    );
    const renderFieldVisitInline = createRenderFieldVisitInline(ctx);
    const renderInlineDecision = createRenderInlineDecision(ctx, {
        findActiveApprovedIncompleteRow,
        resolveFieldVisitScheduleRow,
        renderFieldVisitInline,
    });
    const renderEvictionBranchPanelBody = createRenderEvictionBranchPanelBody(
        ctx,
        renderInlineDecision,
    );
    const renderBranchChevron = createRenderBranchChevron(ctx);

    return {
        buildArabicDateLabel,
        buildArabicTimeLabel,
        renderRowFollowupBlock,
        renderFieldVisitInline,
        findActiveApprovedIncompleteRow,
        resolveFieldVisitScheduleRow,
        renderInlineDecision,
        renderEvictionBranchPanelBody,
        renderBranchChevron,
    };
}
