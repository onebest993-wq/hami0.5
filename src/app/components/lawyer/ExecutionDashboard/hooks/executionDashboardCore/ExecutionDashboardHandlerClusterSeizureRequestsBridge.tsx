// @ts-nocheck
import { useEffect } from 'react';
import {
    collectSeizureHeavyHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardCoreHandlerClusterFoundationSeizure } from './useExecutionDashboardCoreHandlerClusterFoundationSeizure';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import { useExecutionDashboardCoerciveActionBridge } from './useExecutionDashboardCoerciveActionBridge';
import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterSeizureRequestsBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterSeizureRequestsBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterSeizureRequestsBridgeProps) {
    const resolvedInput = collectSeizureHeavyHandlerClusterContext(input as HandlerClusterContextSpreads);
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(resolvedInput);

    const {
        executionData,
        persistExecutionMerge,
        showToast,
        saveCoerciveActionRef,
        setShowCoerciveActionForm,
        settlementGuarantorGate,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        activeWorkspaceDebtorForFollowup,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        coerciveSubjectRef,
        setLastActionDate,
        setUnifiedLedgerRevision,
    } = resolvedInput as Record<string, unknown>;

    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData,
        persistExecutionMerge,
        showToast,
    });

    const { realEstateSeizureHandlers, thirdPartySeizureHandlers } =
        useExecutionDashboardCoreHandlerClusterFoundationSeizure(resolvedInput, pushTimelineEvent);

    const { followupSeizureHandlers } = useExecutionDashboardCoreHandlerClusterSeizureFollowup(
        resolvedInput,
        { pushTimelineEvent },
    );

    const coerciveActionBridge = useExecutionDashboardCoerciveActionBridge({
        saveCoerciveActionRef,
        setShowCoerciveActionForm,
        settlementGuarantorGate,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        activeWorkspaceDebtorForFollowup,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        coerciveSubjectRef,
        showToast,
        setLastActionDate,
        setUnifiedLedgerRevision,
    });

    useEffect(() => {
        onCluster({
            removeJudicialCustodianEntry,
            pushTimelineEventBinding,
            pushTimelineEvent,
            followupSeizureHandlers,
            coerciveActionBridge,
            realEstateSeizureHandlers,
            thirdPartySeizureHandlers,
        });
    }, [
        coerciveActionBridge,
        followupSeizureHandlers,
        onCluster,
        pushTimelineEvent,
        pushTimelineEventBinding,
        realEstateSeizureHandlers,
        removeJudicialCustodianEntry,
        thirdPartySeizureHandlers,
    ]);

    return null;
}
