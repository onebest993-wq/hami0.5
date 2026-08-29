import { asHandlerClusterSpreads, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { collectDossierSupportHandlerClusterContext } from './collectHandlerClusterContext';
import { useExecutionDashboardCoreHandlerClusterFoundationCore } from './useExecutionDashboardCoreHandlerClusterFoundationCore';
import { useExecutionDashboardCoreHandlerClusterDossierSupport } from './useExecutionDashboardCoreHandlerClusterDossierSupport';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterDossierSupportBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterDossierSupportBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterDossierSupportBridgeProps) {
    const resolvedInput = collectDossierSupportHandlerClusterContext(asHandlerClusterSpreads(input));
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
