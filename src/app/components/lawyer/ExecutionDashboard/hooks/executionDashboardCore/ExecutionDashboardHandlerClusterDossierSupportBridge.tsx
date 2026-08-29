import {
    collectDossierSupportHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterDossierSupport } from './useExecutionDashboardCoreHandlerClusterDossierSupport';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

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

    const cluster: Record<string, unknown> = {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        ...support,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            firstActiveAppealDecisionId,
            removeJudicialCustodianEntry,
            pushTimelineEvent,
            propertyInlineSaveCtx,
            ...handlerBagKeyFingerprint(support.dossierLifecycleActions as Record<string, unknown>),
            ...handlerBagKeyFingerprint(support.dossierMetaWorkflow as Record<string, unknown>),
            ...handlerBagKeyFingerprint(support.parentDossierPersistence as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
