import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './useExecutionDashboardVoluntaryPeriodHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

type Props = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

/**
 * معالجات وفاة الخصوم (partyDeathHandlers) استُضيفت في core
 * (useExecutionDashboardCore) لأن قائمة ⋮ متاحة قبل أي بوابة جسر —
 * هذا الجسر يوفّر معالجات المهلة الطوعية فقط.
 */
export function ExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge({
    input,
    onCluster,
}: Props) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads);

    const voluntaryPeriodHandlers = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule: c.isEvictionExecutionModule,
        evictionGraceAnchorDate: c.evictionGraceAnchorDate,
        executionData: c.executionData,
        voluntaryEndOptimistic: c.voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey: c.unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved: c.primaryDebtorKeyResolved,
        activeDebtorNoticeScope: c.activeDebtorNoticeScope,
        debtorNotificationDate: c.debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic: c.noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra: c.manualGraceCalendarExtra,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setVoluntaryEndOptimistic: c.setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic: c.setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents: c.setTimelineEvents,
        voluntaryAttendanceCount: c.voluntaryAttendanceCount,
        summoningRound: c.summoningRound,
        setDebtorSummonsMarkerLocal: c.setDebtorSummonsMarkerLocal,
        setDebtorAttendedVoluntarily: c.setDebtorAttendedVoluntarily,
        setActiveNoticeState: c.setActiveNoticeState,
        setVoluntaryAttendanceCount: c.setVoluntaryAttendanceCount,
        setSummoningRound: c.setSummoningRound,
        setDebtorNotificationDate: c.setDebtorNotificationDate,
    });

    const cluster: Record<string, unknown> = { voluntaryPeriodHandlers };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        handlerBagKeyFingerprint(voluntaryPeriodHandlers as Record<string, unknown>),
        onCluster,
    );

    return null;
}
