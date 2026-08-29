import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    getDebtorNoticeStateForKey,
    getDebtorNotificationCountForKey,
    getDebtorSummonsMarkerForKey,
} from '@/app/utils/noticeDebtorScope';
import { useExecutionDashboardScopedDebtorNoticeSync } from './useExecutionDashboardRuntimeSyncEffects';
import type { Dispatch, SetStateAction } from 'react';

export function useDebtorWorkspaceNoticeTail(input: {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string | null | undefined;
    primaryDebtorKeyResolved: string | null | undefined;
    followupAssignmentWorkspaceCtx: { activeDebtorKey: string };
    showFollowupSolidaryDebtorTabs: boolean;
    setNotificationCount: Dispatch<SetStateAction<number>>;
    setDebtorSummonsMarkerLocal: Dispatch<
        SetStateAction<ExecutionFile['debtor_summons_marker'] | null | undefined>
    >;
}) {
    const {
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        followupAssignmentWorkspaceCtx,
        showFollowupSolidaryDebtorTabs,
        setNotificationCount,
        setDebtorSummonsMarkerLocal,
    } = input;

    const activeDebtorNoticeScope = useMemo(
        () =>
            getDebtorNoticeStateForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_notification_date_by_debtor,
            executionData?.execution_memo_anchor_date_by_debtor,
            executionData?.active_notice_state_by_debtor,
            executionData?.notice_voluntary_period_end_declared_by_debtor,
            executionData?.debtor_absence_badge_dismissed_by_debtor,
            executionData?.debtorNotificationDate,
            executionData?.execution_memo_anchor_date,
            executionData?.activeNoticeState,
            executionData?.notice_voluntary_period_end_declared,
            executionData?.debtor_absence_badge_dismissed,
            executionData?.debtors,
            executionData,
        ],
    );

    const scopedNotificationCount = useMemo(
        () =>
            getDebtorNotificationCountForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.notification_count_by_debtor,
            executionData?.notificationCount,
            executionData,
        ],
    );

    const scopedSummonsMarker = useMemo(
        () =>
            getDebtorSummonsMarkerForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_summons_marker_by_debtor,
            executionData?.debtor_summons_marker,
            executionData,
        ],
    );

    useExecutionDashboardScopedDebtorNoticeSync({
        scopedNotificationCount,
        unifiedSummonsTargetDebtorKey,
        scopedSummonsMarker,
        setNotificationCount,
        setDebtorSummonsMarkerLocal,
    });

    const followupActiveDebtorNoticeScope = useMemo(
        () =>
            getDebtorNoticeStateForKey(
                executionData,
                followupAssignmentWorkspaceCtx.activeDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            followupAssignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_notification_date_by_debtor,
            executionData?.execution_memo_anchor_date_by_debtor,
            executionData?.active_notice_state_by_debtor,
            executionData?.notice_voluntary_period_end_declared_by_debtor,
            executionData?.debtor_absence_badge_dismissed_by_debtor,
            executionData?.debtorNotificationDate,
            executionData?.execution_memo_anchor_date,
            executionData?.activeNoticeState,
            executionData?.notice_voluntary_period_end_declared,
            executionData?.debtor_absence_badge_dismissed,
            executionData?.debtors,
            executionData,
        ],
    );

    const modalActiveDebtorNoticeScope = showFollowupSolidaryDebtorTabs
        ? followupActiveDebtorNoticeScope
        : activeDebtorNoticeScope;

    return {
        activeDebtorNoticeScope,
        scopedNotificationCount,
        scopedSummonsMarker,
        followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope,
    };
}
