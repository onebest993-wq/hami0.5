import { useCallback, useLayoutEffect } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardNotifyDebtorHandler } from './useExecutionDashboardNotifyDebtorHandler';
import { useExecutionDashboardHeirsNotificationHandlers } from './useExecutionDashboardHeirsNotificationHandlers';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from './useExecutionDashboardDebtorSummonsCoerciveHandlers';
import { useExecutionDashboardDecisionsHeirsModalExclusivity } from './useExecutionDashboardDecisionsHeirsModalExclusivity';
import { useExecutionDashboardHeirsInvestigationSync } from './useExecutionDashboardHeirsInvestigationSync';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterCoerciveSupportBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveSupportBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveSupportBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads) as any;

    const dismissDebtorAbsenceBadge = useCallback(() => {
        if (c.executionData) {
            if (
                c.getDebtorNoticeStateForKey(
                    c.executionData,
                    c.unifiedSummonsTargetDebtorKey,
                    c.primaryDebtorKeyResolved,
                ).absenceBadgeDismissed
            ) {
                return;
            }
        }
        if (c.executionData?.id) {
            c.persistExecutionMerge(
                c.buildDebtorNoticePatchForKey(
                    c.executionData,
                    c.unifiedSummonsTargetDebtorKey,
                    c.primaryDebtorKeyResolved,
                    { absenceBadgeDismissed: true },
                ),
            );
        } else {
            c.persistExecutionMerge({ debtor_absence_badge_dismissed: true });
        }
        c.showToast('تم إخفاء إشارة عدم الحضور', 'info');
    }, [
        c.executionData,
        c.unifiedSummonsTargetDebtorKey,
        c.primaryDebtorKeyResolved,
        c.persistExecutionMerge,
        c.showToast,
    ]);

    useLayoutEffect(() => {
        if (!c.debtorBrowserTabsMode || c.debtorWorkspaceEntries.length === 0) return;
        const el = c.debtorWorkspaceChipStripRef.current;
        if (!el) return;
        return c.bindHorizontalWheelToScroll(el);
    }, [c.bindHorizontalWheelToScroll, c.debtorBrowserTabsMode, c.debtorWorkspaceEntries.length, c.debtorWorkspaceChipStripRef]);

    const notifyDebtorHandler = useExecutionDashboardNotifyDebtorHandler({
        executionData: c.executionData,
        unifiedSummonsTargetDebtorKey: c.unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        activeDebtorNoticeScope: c.activeDebtorNoticeScope,
        debtorNotificationDate: c.debtorNotificationDate,
        notificationPurpose: c.notificationPurpose,
        notificationCount: c.notificationCount,
        subsequentNoticeUnlocked: c.subsequentNoticeUnlocked,
        isEvictionExecutionModule: c.isEvictionExecutionModule,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setDebtorNotificationDate: c.setDebtorNotificationDate,
        setLastActionDate: c.setLastActionDate,
        setActiveNoticeState: c.setActiveNoticeState,
        setNoticeVoluntaryPeriodEndOptimistic: c.setNoticeVoluntaryPeriodEndOptimistic,
        setVoluntaryEndOptimistic: c.setVoluntaryEndOptimistic,
        setNotificationCount: c.setNotificationCount,
        setTimelineEvents: c.setTimelineEvents,
        setDebtorSummonsMarkerLocal: c.setDebtorSummonsMarkerLocal,
        setNotificationPurpose: c.setNotificationPurpose,
        setSummonsMarkerPopoverOpen: c.setSummonsMarkerPopoverOpen,
    });

    const heirsNotificationHandlers = useExecutionDashboardHeirsNotificationHandlers({
        executionData: c.executionData,
        debtorBrowserTabsMode: c.debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup: c.activeWorkspaceDebtorForFollowup,
        activeDebtorIsDeceased: c.activeDebtorIsDeceased,
        heirNoticeDateDrafts: c.heirNoticeDateDrafts,
        decisionsStorageExecutionId: c.decisionsStorageExecutionId,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        setHeirNoticeDateDrafts: c.setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir: c.setHeirSummonsDatePickerOpenByHeir,
        setShowHeirsNotificationModal: c.setShowHeirsNotificationModal,
    });

    useExecutionDashboardDecisionsHeirsModalExclusivity(
        c.showDecisionsModal,
        c.showHeirsNotificationModal,
        c.setShowHeirsNotificationModal,
    );

    useExecutionDashboardHeirsInvestigationSync({
        executionData: c.executionData,
        decisionsStorageExecutionId: c.decisionsStorageExecutionId,
        decisionsReloadEpoch: c.decisionsReloadEpoch,
        persistExecutionMerge: c.persistExecutionMerge,
    });

    const debtorSummonsCoerciveHandlers = useExecutionDashboardDebtorSummonsCoerciveHandlers({
        executionData: c.executionData,
        unifiedSummonsTargetDebtorKey: c.unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal: c.debtorSummonsMarkerLocal,
        summonsPurposeDraft: c.summonsPurposeDraft,
        forcedSummoningAnalysis: c.forcedSummoningAnalysis,
        activeDebtorNameResolved: c.activeDebtorNameResolved,
        activeFollowupDebtorKey: c.activeFollowupDebtorKey,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        setDebtorSummonsMarkerLocal: c.setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen: c.setSummonsMarkerPopoverOpen,
        setForcedAttendanceIssued: c.setForcedAttendanceIssued,
        setActiveNoticeState: c.setActiveNoticeState,
        setForcedPathAttendanceSecured: c.setForcedPathAttendanceSecured,
        setDebtorForcedToAttend: c.setDebtorForcedToAttend,
        setInvestigationCourtRequested: c.setInvestigationCourtRequested,
        setInvestigationPathDebtorPresent: c.setInvestigationPathDebtorPresent,
        setInvestigationMemoIssued: c.setInvestigationMemoIssued,
        setArrestWarrantUnlocked: c.setArrestWarrantUnlocked,
        setDebtorEvaded: c.setDebtorEvaded,
        setDebtorArrested: c.setDebtorArrested,
        setEarnerFeeCollectionSm: c.setEarnerFeeCollectionSm,
    });

    const cluster: Record<string, unknown> = {
        dismissDebtorAbsenceBadge,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
    };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            dismissDebtorAbsenceBadge,
            ...handlerBagKeyFingerprint(notifyDebtorHandler as Record<string, unknown>),
            ...handlerBagKeyFingerprint(heirsNotificationHandlers as Record<string, unknown>),
            ...handlerBagKeyFingerprint(debtorSummonsCoerciveHandlers as Record<string, unknown>),
        ],
        onCluster,
    );

    return null;
}
