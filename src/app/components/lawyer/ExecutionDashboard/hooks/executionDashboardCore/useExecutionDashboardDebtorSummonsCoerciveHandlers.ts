/** Phase C — علامة التبليغ + مسار الإحضار الجبري والتحقيق */
import type { UseExecutionDashboardDebtorSummonsCoerciveHandlersParams } from './useExecutionDashboardDebtorSummonsCoerciveHandlers.types';
import { useDebtorSummonsMarkerHandlers } from './useDebtorSummonsMarkerHandlers';
import { useDebtorForcedAttendanceInvestigationHandlers } from './useDebtorForcedAttendanceInvestigationHandlers';
import { useDebtorEarnerFeeSmHandlers } from './useDebtorEarnerFeeSmHandlers';

export type {
    ForcedSummoningAnalysis,
    UseExecutionDashboardDebtorSummonsCoerciveHandlersParams,
} from './useExecutionDashboardDebtorSummonsCoerciveHandlers.types';

export function useExecutionDashboardDebtorSummonsCoerciveHandlers({
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    debtorSummonsMarkerLocal,
    summonsPurposeDraft,
    forcedSummoningAnalysis,
    activeDebtorNameResolved,
    activeFollowupDebtorKey,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setDebtorSummonsMarkerLocal,
    setSummonsMarkerPopoverOpen,
    setForcedAttendanceIssued,
    setActiveNoticeState,
    setForcedPathAttendanceSecured,
    setDebtorForcedToAttend,
    setInvestigationCourtRequested,
    setInvestigationPathDebtorPresent,
    setInvestigationMemoIssued,
    setArrestWarrantUnlocked,
    setDebtorEvaded,
    setDebtorArrested,
    setEarnerFeeCollectionSm,
}: UseExecutionDashboardDebtorSummonsCoerciveHandlersParams) {
    const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
    } = useDebtorSummonsMarkerHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
    });

    const {
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        handleArrestWarrant,
    } = useDebtorForcedAttendanceInvestigationHandlers({
        forcedSummoningAnalysis,
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setInvestigationCourtRequested,
        setInvestigationPathDebtorPresent,
        setInvestigationMemoIssued,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
    });

    const { applyEarnerFeeSmAction, resetEarnerFeeNotificationCycle } = useDebtorEarnerFeeSmHandlers({
        forcedSummoningAnalysis,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setEarnerFeeCollectionSm,
        setActiveNoticeState,
        setForcedAttendanceIssued,
        setInvestigationCourtRequested,
        setInvestigationMemoIssued,
        setInvestigationPathDebtorPresent,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setDebtorArrested,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
        handleForcedAttendance,
        handleDebtorEvasion,
        handleRequestInvestigationFromForced,
        handleInvestigationIssueMemo,
    });

    return {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        applyEarnerFeeSmAction,
        resetEarnerFeeNotificationCycle,
        handleArrestWarrant,
    };
}
