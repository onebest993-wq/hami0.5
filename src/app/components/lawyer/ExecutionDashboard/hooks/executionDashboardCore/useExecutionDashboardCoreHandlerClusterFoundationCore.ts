// @ts-nocheck
import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardPropertyInlineSaveContext } from './useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardSupabaseTimelineHydrate } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionAICopilot } from '../useExecutionAICopilot';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFoundationCore(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const {
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        executionData,
        executionDataRef,
        executionId,
        parentDossierId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        pushTimelineEventRef,
        timelineEventsRef,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    } = c as Record<string, unknown>;

    const { firstActiveAppealDecisionId } = useExecutionAICopilot({
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
    });

    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData,
        persistExecutionMerge,
        showToast,
    });

    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        executionDataRef,
        persistExecutionMerge,
        setTimelineEvents,
        timelineEventsRef,
    });

    const { pushTimelineEvent } = pushTimelineEventBinding;

    if (pushTimelineEventRef) {
        (pushTimelineEventRef as { current?: unknown }).current = pushTimelineEvent;
    }

    const propertyInlineSaveCtx = useExecutionDashboardPropertyInlineSaveContext({
        decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    });

    useExecutionDashboardSupabaseTimelineHydrate({
        executionDataId: executionData?.id,
        setTimelineEvents,
    });

    return {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
    };
}
