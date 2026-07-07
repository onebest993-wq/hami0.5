// @ts-nocheck
import { useEffect } from 'react';
import {
    collectDossierSupportHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterDossierSupport } from './useExecutionDashboardCoreHandlerClusterDossierSupport';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterDossierSupportBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterDossierSupportBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterDossierSupportBridgeProps) {
    const resolvedInput = collectDossierSupportHandlerClusterContext(input as HandlerClusterContextSpreads);
    const foundation = useExecutionDashboardCoreHandlerClusterFoundationCore(resolvedInput);
    const {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
    } = foundation;

    const support = useExecutionDashboardCoreHandlerClusterDossierSupport(resolvedInput, {
        pushTimelineEvent,
    });

    useEffect(() => {
        onCluster({
            firstActiveAppealDecisionId,
            removeJudicialCustodianEntry,
            pushTimelineEventBinding,
            pushTimelineEvent,
            propertyInlineSaveCtx,
            ...support,
        });
    }, [
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        support,
        onCluster,
    ]);

    return null;
}
