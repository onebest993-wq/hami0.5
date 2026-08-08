/** Phase C Slice 19 — ذمة المدينين + نطاق الإخطار + الجدول الزمني الم scoped */
import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    buildDebtorLiabilityGroups,
    isPerDebtorSolidarySplitMode,
    readAllDebtorRowsFromExecution,
    shouldShowDebtorLiabilityGroupTabs,
    type DebtorLiabilityGroup,
} from '@/app/utils/debtorLiabilityGroups';
import { timelineEventBelongsToDebtorWorkspace } from '@/app/utils/timelineDebtorScope';
import {
    getDebtorNoticeStateForKey,
    getDebtorNotificationCountForKey,
    getDebtorSummonsMarkerForKey,
} from '@/app/utils/noticeDebtorScope';
import { useAllDebtorsUnified } from '../useAllDebtorsUnified';
import { useDebtorWorkspaceEntries } from '../useDebtorWorkspaceEntries';
import { useCreditorWorkspace } from '../useCreditorWorkspace';
import { useExecutionDashboardDebtorTabIndexClamp } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardFollowupSolidaryIndexReset } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardScopedDebtorNoticeSync } from './useExecutionDashboardRuntimeSyncEffects';

export type UseExecutionDashboardDebtorWorkspaceContextParams = {
    executionData: ExecutionFile | null | undefined;
    creditors: ExecutionFile['creditors'] | undefined;
    debtors: ExecutionFile['debtors'] | undefined;
    executionDebtorTabIndex: number;
    setExecutionDebtorTabIndex: Dispatch<SetStateAction<number>>;
    followupSolidaryDebtorIndex: number;
    setFollowupSolidaryDebtorIndex: Dispatch<SetStateAction<number>>;
    mergedTimelineEvents: TimelineEvent[];
    summonsContextDebtorKey: string | null | undefined;
    setNotificationCount: Dispatch<SetStateAction<number>>;
    setDebtorSummonsMarkerLocal: Dispatch<
        SetStateAction<ExecutionFile['debtor_summons_marker'] | null | undefined>
    >;
};

export function useExecutionDashboardDebtorWorkspaceContext({
    executionData,
    creditors,
    debtors,
    executionDebtorTabIndex,
    setExecutionDebtorTabIndex,
    followupSolidaryDebtorIndex,
    setFollowupSolidaryDebtorIndex,
    mergedTimelineEvents,
    summonsContextDebtorKey,
    setNotificationCount,
    setDebtorSummonsMarkerLocal,
}: UseExecutionDashboardDebtorWorkspaceContextParams) {
    const effectiveCreditors = creditors || [];
    const effectiveDebtors = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors;
        }
        return debtors || [];
    }, [debtors, executionData?.debtors]);

    const partyMultiplicityExec = executionData?.party_multiplicity;
    const legacyGlobalSolidary = partyMultiplicityExec?.isSolidaryLiability ?? false;
    const additionalCreditorsPm = partyMultiplicityExec?.additionalCreditors ?? [];

    const allDebtorsUnified = useAllDebtorsUnified(effectiveDebtors, executionData);

    const resolveDebtorSolidaryFlag = useCallback(
        (row: (typeof allDebtorsUnified)[number]) => {
            const primary = effectiveDebtors[0] as import('@/app/types/execution').Debtor | undefined;
            const perDebtorSolidaryMode =
                allDebtorsUnified.length > 1 &&
                (primary?.isSolidaryLiability !== undefined ||
                    (partyMultiplicityExec?.additionalDebtors ?? []).some(
                        (d) => d.isSolidaryLiability !== undefined,
                    ));
            if (perDebtorSolidaryMode) return Boolean(row.isSolidaryLiability);
            return legacyGlobalSolidary;
        },
        [allDebtorsUnified, effectiveDebtors, partyMultiplicityExec?.additionalDebtors, legacyGlobalSolidary],
    );

    const allDebtorsSolidary = useMemo(
        () =>
            allDebtorsUnified.length > 1 &&
            allDebtorsUnified.every((r) => resolveDebtorSolidaryFlag(r)),
        [allDebtorsUnified, resolveDebtorSolidaryFlag],
    );

    const isSolidaryLiability = allDebtorsSolidary;

    const debtorWorkspaceEntries = useDebtorWorkspaceEntries(
        effectiveDebtors,
        executionData?.party_multiplicity?.additionalDebtors,
        allDebtorsUnified,
    );

    const { creditorWorkspaceEntries, creditorNamesTextList } = useCreditorWorkspace(
        effectiveCreditors,
        additionalCreditorsPm,
    );

    useExecutionDashboardDebtorTabIndexClamp({
        allDebtorsUnified,
        executionDataId: executionData?.id,
        debtorWorkspaceEntries,
        partyMultiplicityAdditionalDebtors: partyMultiplicityExec?.additionalDebtors,
        setExecutionDebtorTabIndex,
    });

    const perDebtorSolidarySplitMode = useMemo(
        () =>
            isPerDebtorSolidarySplitMode(
                allDebtorsUnified,
                partyMultiplicityExec?.additionalDebtors,
            ),
        [allDebtorsUnified, partyMultiplicityExec?.additionalDebtors],
    );

    const debtorLiabilityGroups = useMemo(
        (): DebtorLiabilityGroup[] =>
            perDebtorSolidarySplitMode ? buildDebtorLiabilityGroups(debtorWorkspaceEntries) : [],
        [perDebtorSolidarySplitMode, debtorWorkspaceEntries],
    );

    const liabilityGroupTabsMode = shouldShowDebtorLiabilityGroupTabs(
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
    );

    const multiDebtorMode = allDebtorsUnified.length > 1;
    const debtorBrowserTabsMode = liabilityGroupTabsMode
        ? liabilityGroupTabsMode
        : multiDebtorMode && !allDebtorsSolidary;

    const activeLiabilityGroup = liabilityGroupTabsMode
        ? (debtorLiabilityGroups[executionDebtorTabIndex] ?? debtorLiabilityGroups[0] ?? null)
        : null;
    const activeGroupEntries = activeLiabilityGroup?.entries ?? [];
    const activeLiabilityGroupId = activeLiabilityGroup?.id ?? null;

    const allDebtorRowsForLiability = useMemo(
        () => readAllDebtorRowsFromExecution(executionData as Record<string, unknown> | null | undefined),
        [executionData],
    );

    const activeDebtorSolidary = useMemo(() => {
        if (liabilityGroupTabsMode && activeLiabilityGroupId) {
            return activeLiabilityGroupId === 'solidary';
        }
        const row = allDebtorsUnified[executionDebtorTabIndex];
        return row ? resolveDebtorSolidaryFlag(row) : legacyGlobalSolidary;
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroupId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        resolveDebtorSolidaryFlag,
        legacyGlobalSolidary,
    ]);

    const activeWorkspaceDebtorForFollowup = useMemo(() => {
        if (!debtorBrowserTabsMode) return null;
        if (liabilityGroupTabsMode) {
            return activeGroupEntries[0] ?? null;
        }
        if (debtorWorkspaceEntries.length === 0) return null;
        return (
            debtorWorkspaceEntries[executionDebtorTabIndex] ??
            debtorWorkspaceEntries[0] ??
            null
        );
    }, [
        debtorBrowserTabsMode,
        liabilityGroupTabsMode,
        activeGroupEntries,
        debtorWorkspaceEntries,
        executionDebtorTabIndex,
    ]);

    const primaryDebtorWorkspaceKey = debtorWorkspaceEntries[0]?.key;
    const primaryDebtorKeyResolved = primaryDebtorWorkspaceKey ?? 'primary_debtor';

    const showFollowupSolidaryDebtorTabs =
        liabilityGroupTabsMode &&
        activeLiabilityGroupId === 'solidary' &&
        activeGroupEntries.length > 1;

    const effectiveFollowupDebtorEntry = useMemo(() => {
        if (showFollowupSolidaryDebtorTabs) {
            return (
                activeGroupEntries[followupSolidaryDebtorIndex] ??
                activeGroupEntries[0] ??
                null
            );
        }
        return activeWorkspaceDebtorForFollowup;
    }, [
        showFollowupSolidaryDebtorTabs,
        activeGroupEntries,
        followupSolidaryDebtorIndex,
        activeWorkspaceDebtorForFollowup,
    ]);

    const followupAssignmentWorkspaceCtx = useMemo(
        () => ({
            splitDebtsTabs: debtorBrowserTabsMode,
            activeDebtorKey:
                effectiveFollowupDebtorEntry?.key ??
                primaryDebtorWorkspaceKey ??
                'primary_debtor',
            activeIsPrimary: Boolean(effectiveFollowupDebtorEntry?.isPrimary),
        }),
        [
            debtorBrowserTabsMode,
            effectiveFollowupDebtorEntry,
            primaryDebtorWorkspaceKey,
        ],
    );

    useExecutionDashboardFollowupSolidaryIndexReset(
        executionDebtorTabIndex,
        activeLiabilityGroupId ?? undefined,
        setFollowupSolidaryDebtorIndex,
    );

    const mergedTimelineEventsDebtorScoped = useMemo(() => {
        if (!debtorBrowserTabsMode || !primaryDebtorWorkspaceKey) {
            return mergedTimelineEvents;
        }
        if (liabilityGroupTabsMode && activeGroupEntries.length > 0) {
            const keys = new Set(activeGroupEntries.map((ent) => ent.key));
            return mergedTimelineEvents.filter((e) => {
                for (const ak of keys) {
                    if (timelineEventBelongsToDebtorWorkspace(e, ak, primaryDebtorWorkspaceKey)) {
                        return true;
                    }
                }
                return false;
            });
        }
        if (!activeWorkspaceDebtorForFollowup) {
            return mergedTimelineEvents;
        }
        const ak = activeWorkspaceDebtorForFollowup.key;
        return mergedTimelineEvents.filter((e) =>
            timelineEventBelongsToDebtorWorkspace(e, ak, primaryDebtorWorkspaceKey),
        );
    }, [
        debtorBrowserTabsMode,
        liabilityGroupTabsMode,
        activeGroupEntries,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        mergedTimelineEvents,
    ]);

    const mergedTimelineRadarPreviewLimit = useMemo(() => {
        const base = debtorBrowserTabsMode ? mergedTimelineEventsDebtorScoped : mergedTimelineEvents;
        return base.some((e) => Boolean(e.isPinned)) ? 5 : 3;
    }, [debtorBrowserTabsMode, mergedTimelineEventsDebtorScoped, mergedTimelineEvents]);

    const assignmentWorkspaceCtx = useMemo(
        () => ({
            splitDebtsTabs: debtorBrowserTabsMode,
            activeDebtorKey:
                debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                    ? activeWorkspaceDebtorForFollowup.key
                    : primaryDebtorWorkspaceKey ?? 'primary_debtor',
            activeIsPrimary: !debtorBrowserTabsMode || Boolean(activeWorkspaceDebtorForFollowup?.isPrimary),
        }),
        [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, primaryDebtorWorkspaceKey],
    );

    const unifiedSummonsTargetDebtorKey = useMemo(
        () => summonsContextDebtorKey ?? assignmentWorkspaceCtx.activeDebtorKey,
        [summonsContextDebtorKey, assignmentWorkspaceCtx.activeDebtorKey],
    );

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
        effectiveCreditors,
        effectiveDebtors,
        allDebtorsUnified,
        resolveDebtorSolidaryFlag,
        allDebtorsSolidary,
        isSolidaryLiability,
        debtorWorkspaceEntries,
        creditorWorkspaceEntries,
        creditorNamesTextList,
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
        liabilityGroupTabsMode,
        multiDebtorMode,
        debtorBrowserTabsMode,
        activeLiabilityGroup,
        activeGroupEntries,
        activeLiabilityGroupId,
        allDebtorRowsForLiability,
        activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved,
        showFollowupSolidaryDebtorTabs,
        effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        assignmentWorkspaceCtx,
        unifiedSummonsTargetDebtorKey,
        activeDebtorNoticeScope,
        scopedNotificationCount,
        scopedSummonsMarker,
        followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope,
    };
}
