/** Phase C — مركز تبليغ الورثة + مهلة التكليف */
import { useCallback } from 'react';
import { useActiveDebtorHeirsForNotification } from '../useActiveDebtorHeirsForNotification';
import { useHeirsWorkflowByHeir } from '../useHeirsWorkflowByHeir';
import { useHeirsMemoHandlers } from './heirsMemoHandlers';
import { useHeirsSummonsHandlers } from './heirsSummonsHandlers';
import {
    computeDeadlineYmd as computeDeadlineYmdFn,
    computeDaysRemaining as computeDaysRemainingFn,
    normalizeHeirWorkflowKey,
    useUpsertHeirWorkflow,
} from './heirsWorkflowUpsert';

export type UseExecutionDashboardHeirsNotificationHandlersParams = {
    executionData: import('@/app/types/execution').ExecutionFile | null | undefined;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: { d: { name?: string } } | null | undefined;
    activeDebtorIsDeceased: boolean;
    heirNoticeDateDrafts: Record<string, string>;
    decisionsStorageExecutionId: string | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: import('react').Dispatch<
        import('react').SetStateAction<import('@/app/types/execution').TimelineEvent[]>
    >;
    setHeirNoticeDateDrafts: import('react').Dispatch<
        import('react').SetStateAction<Record<string, string>>
    >;
    setHeirSummonsDatePickerOpenByHeir: import('react').Dispatch<
        import('react').SetStateAction<Record<string, boolean>>
    >;
    setShowHeirsNotificationModal: (open: boolean) => void;
};

export function useExecutionDashboardHeirsNotificationHandlers({
    executionData,
    debtorBrowserTabsMode,
    activeWorkspaceDebtorForFollowup,
    activeDebtorIsDeceased,
    heirNoticeDateDrafts,
    decisionsStorageExecutionId,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setHeirNoticeDateDrafts,
    setHeirSummonsDatePickerOpenByHeir,
    setShowHeirsNotificationModal,
}: UseExecutionDashboardHeirsNotificationHandlersParams) {
    const activeDebtorHeirsForNotification = useActiveDebtorHeirsForNotification(
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
    );

    const normalizeHeirWorkflowKeyCb = useCallback(
        (name: string) => normalizeHeirWorkflowKey(name),
        [],
    );

    const heirsWorkflowByHeir = useHeirsWorkflowByHeir(
        executionData,
        activeDebtorHeirsForNotification,
        normalizeHeirWorkflowKeyCb,
    );

    const upsertHeirWorkflow = useUpsertHeirWorkflow(
        executionData,
        persistExecutionMerge,
        setTimelineEvents,
    );

    const computeDeadlineYmd = useCallback(computeDeadlineYmdFn, []);
    const computeDaysRemaining = useCallback(computeDaysRemainingFn, []);

    const {
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
    } = useHeirsMemoHandlers({
        activeDebtorIsDeceased,
        activeDebtorHeirsForNotification,
        heirNoticeDateDrafts,
        nextTimelineId,
        showToast,
        upsertHeirWorkflow,
        setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir,
        setShowHeirsNotificationModal,
    });

    const {
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    } = useHeirsSummonsHandlers({
        heirNoticeDateDrafts,
        heirsWorkflowByHeir,
        decisionsStorageExecutionId,
        nextTimelineId,
        showToast,
        upsertHeirWorkflow,
        setHeirSummonsDatePickerOpenByHeir,
    });

    return {
        activeDebtorHeirsForNotification,
        heirsWorkflowByHeir,
        normalizeHeirWorkflowKey: normalizeHeirWorkflowKeyCb,
        computeDeadlineYmd,
        computeDaysRemaining,
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    };
}
