import { useExecutionDashboardCoreHandlerClusterFoundationTimeline } from './useExecutionDashboardCoreHandlerClusterFoundationTimeline';
import { useExecutionDashboardDossierControlsHandlers } from './useExecutionDashboardDossierControlsHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFollowupDossierControls(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterFoundationTimeline(c);

    const {
        executionData,
        decisionsStorageExecutionId,
        parentExecutionFile,
        isInabaActive,
        isUnifiedTabActive,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setExecutionStorageTick,
    } = c as Record<string, unknown>;

    const dossierFollowupHandlers = useExecutionDashboardDossierControlsHandlers({
        executionData,
        decisionsStorageExecutionId,
        parentExecutionFile,
        isInabaActive,
        isUnifiedTabActive,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setExecutionStorageTick,
    });

    return {
        pushTimelineEventBinding,
        pushTimelineEvent,
        dossierFollowupHandlers,
    };
}
