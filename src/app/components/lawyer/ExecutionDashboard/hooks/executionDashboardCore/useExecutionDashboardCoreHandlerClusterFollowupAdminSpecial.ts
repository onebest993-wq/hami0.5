import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardDossierAdminFollowupHandlers } from './useExecutionDashboardDossierAdminFollowupHandlers';
import { asHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { FollowupAdminSpecialHandlerClusterInput } from './followupAdminSpecialHandlerClusterInput';

export function useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial(
    c: FollowupAdminSpecialHandlerClusterInput,
) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(asHandlerClusterInput(c));

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
    } = c;

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
