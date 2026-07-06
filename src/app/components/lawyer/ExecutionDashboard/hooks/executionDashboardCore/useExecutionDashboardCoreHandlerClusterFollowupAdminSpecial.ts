// @ts-nocheck
import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardDossierAdminFollowupHandlers } from './useExecutionDashboardDossierAdminFollowupHandlers';
import type {
    ExecutionDashboardCoreHandlerClusterInput,
} from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(c);

    const {
        executionData,
        decisionsStorageExecutionId,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        nextTimelineId,
        showToast,
        setSpecialRequestTemplatePick,
        setSpecialRequestContent,
        setSpecialRequestManualTitle,
        setSpecialRequestDate,
    } = c as any;

    const dossierFollowupHandlers = useExecutionDashboardDossierAdminFollowupHandlers({
        executionData,
        decisionsStorageExecutionId,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setSpecialRequestTemplatePick,
        setSpecialRequestContent,
        setSpecialRequestManualTitle,
        setSpecialRequestDate,
    });

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
        dossierFollowupHandlers,
    };
}
