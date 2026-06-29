// @ts-nocheck
/** Phase B Slice 1 — timeline + seizure modal foundation (extracted from handler cluster) */
import { useExecutionDashboardRealEstateSeizureModalHandlers } from './useExecutionDashboardRealEstateSeizureModalHandlers';
import { useExecutionDashboardThirdPartySeizureHandlers } from './useExecutionDashboardThirdPartySeizureHandlers';
import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardPropertyInlineSaveContext } from './useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardSupabaseTimelineHydrate } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionAICopilot } from '../useExecutionAICopilot';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterFoundation(
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
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureSnapshotRef,
        nextTimelineId,
        setRealEstateSeizureAssets,
        setShowRealEstateSeizureModal,
        getLocalTodayYmd,
        setThirdPartySeizuresUi,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    } = c as Record<string, unknown>;

    const { executionCopilotDecisions, firstActiveAppealDecisionId } = useExecutionAICopilot({
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

    const realEstateSeizureHandlers = useExecutionDashboardRealEstateSeizureModalHandlers({
        decisionsStorageExecutionId,
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureSnapshotRef,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setRealEstateSeizureAssets,
        setShowRealEstateSeizureModal,
    });

    const thirdPartySeizureHandlers = useExecutionDashboardThirdPartySeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setThirdPartySeizuresUi,
    });

    useExecutionDashboardSupabaseTimelineHydrate({
        executionDataId: executionData?.id,
        setTimelineEvents,
    });

    return {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    };
}
