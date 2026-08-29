import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardPropertyInlineSaveContext } from './useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardMovableInlineSaveContext } from './useExecutionDashboardMovableInlineSaveContext';
import { useExecutionDashboardSupabaseTimelineHydrate } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDecisionAppealSnapshot } from '../useExecutionDecisionAppealSnapshot';
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
    } = c;

    const { firstActiveAppealDecisionId } = useExecutionDecisionAppealSnapshot({
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
        executionData: executionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    });

    const movableInlineSaveCtx = useExecutionDashboardMovableInlineSaveContext({
        decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId,
        executionData: executionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
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
        movableInlineSaveCtx,
    };
}
