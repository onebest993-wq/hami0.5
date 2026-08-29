import { asHandlerClusterSpreads, handlerClusterSourceBags, pickHandlerClusterKeys, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import { useExecutionDashboardStayHandlers } from './useExecutionDashboardStayHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

type StayHandlersInput = Parameters<typeof useExecutionDashboardStayHandlers>[0];

type Props = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

const STAY_HANDLER_CLUSTER_KEYS = [
    'currentFileId',
    'executionData',
    'file',
    'nextTimelineId',
    'persistExecutionMerge',
    'setCaseTasksPending',
    'setExecutionPaused',
    'setTimelineEvents',
    'showToast',
] as const;

export function ExecutionDashboardHandlerClusterCoerciveStayBridge({
    input,
    onCluster,
}: Props) {
    const c = pickHandlerClusterKeys(
        handlerClusterSourceBags(asHandlerClusterSpreads(input)),
        STAY_HANDLER_CLUSTER_KEYS,
    ) as unknown as StayHandlersInput;

    const stayHandlers = useExecutionDashboardStayHandlers({
        executionData: c.executionData,
        file: c.file,
        currentFileId: c.currentFileId,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        setCaseTasksPending: c.setCaseTasksPending,
        setExecutionPaused: c.setExecutionPaused,
    });

    const cluster: Record<string, unknown> = { stayHandlers };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        handlerBagKeyFingerprint(stayHandlers as Record<string, unknown>),
        onCluster,
    );

    return null;
}
