import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveFoundation } from './useExecutionDashboardCoreHandlerClusterCoerciveFoundation';
import { useExecutionDashboardDebtorEmploymentHandlers } from './useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardPersonalCoerciveDecisionSync } from './useExecutionDashboardPersonalCoerciveDecisionSync';
import { useExecutionDashboardEmployeeInvestigationSync } from './useExecutionDashboardEmployeeInvestigationSync';
import { useExecutionDashboardExecutiveDetentionLifecycle } from './useExecutionDashboardExecutiveDetentionLifecycle';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

type Props = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveFoundationBridge({
    input,
    onCluster,
}: Props) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads) as any;
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterCoerciveFoundation(c);

    const debtorEmploymentHandler = useExecutionDashboardDebtorEmploymentHandlers({
        executionDataRef: c.executionDataRef,
        debtorWorkspaceEntries: c.debtorWorkspaceEntries,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
    });

    const exIdForPersonalDecisions = c.executionData?.id ?? c.executionId;

    useExecutionDashboardPersonalCoerciveDecisionSync({
        executionData: c.executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch: c.decisionsReloadEpoch,
        persistExecutionMerge: c.persistExecutionMerge,
        setTimelineEvents: c.setTimelineEvents,
        nextTimelineId: c.nextTimelineId,
    });

    useExecutionDashboardEmployeeInvestigationSync({
        executionData: c.executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch: c.decisionsReloadEpoch,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
    });

    useExecutionDashboardExecutiveDetentionLifecycle({
        executionData: c.executionData,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
    });

    const cluster: Record<string, unknown> = {
        pushTimelineEventBinding,
        pushTimelineEvent,
        debtorEmploymentHandler,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            pushTimelineEvent,
            ...handlerBagKeyFingerprint(pushTimelineEventBinding as Record<string, unknown>),
            ...handlerBagKeyFingerprint(debtorEmploymentHandler as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
