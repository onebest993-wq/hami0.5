import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useCommandHubTiles } from '@/app/components/lawyer/dashboard/useCommandHubTiles';
import {
    scheduleVisibleDockWidgetsPrefetch,
    scheduleHeavyDockWidgetsIdlePrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import { openHubArchiveFromHomeTile } from '@/app/services/hub/hubHomeOpen';
import { useHomeMainGridSlots } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import { useCommandCenterDockActions } from './useCommandCenterDockActions';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    useHomeDestinationReveal,
    useHomeLazyIslandsReveal,
} from '@/app/runtime/homeDestinationReveal';
import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { canUseNetworkFeatures } from '@/app/services/auth/lawyerAccountStatus';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import type { LawyerDashboardHomeTabProps } from './lawyerDashboardHomeTab.types';
import { SECONDARY_HOME_WIDGET_IDS } from './homeTabWidgetIds';
import type { DockShellBadgeContext } from '@/app/services/settings/dockShellAria';
import { peekFrame1Hydrate } from '@/app/bootstrap/bootFrame1Hydrate';
import {
    peekDashboardFrame1Snapshot,
    patchDashboardFrame1Snapshot,
} from '@/app/bootstrap/dashboardFrame1Snapshot';
import { consumePendingAlertsDockOpen } from '@/app/services/alerts/dockAlertsOpen';

export function useHomeTabContentModel({
    visible,
    calendarUserId,
    clusterScanSources,
    secretaryAlerts,
    alertsLoading,
    alertsError,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAlertResolved,
    onOpenCommunity,
    onOpenProfile,
    onPrimeProfile,
    onPrimeProfilePress,
    userMetadata,
    theme,
    onOpenArchive,
    userId,
    shellAuthUserId,
    onOpenCalendar,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount,
    onOpenFullNotepad,
    onOpenRepository,
    onOpenVault,
    announceBootReveal = false,
}: LawyerDashboardHomeTabProps) {
    const reduceMotion = useReduceMotion();
    useHomeDestinationReveal(visible);
    const lazyIslandsReady = useHomeLazyIslandsReveal(visible);
    const themePrimary = theme.primary ?? '#E6C673';
    const { slots, appearance } = useHomeMainGridSlots(themePrimary);
    const commandHubTiles = useCommandHubTiles();
    const [forumUnreadCount, setForumUnreadCount] = useState(() => {
        const frame = peekFrame1Hydrate()?.forumUnreadCount ?? 0;
        if (frame > 0) return frame;
        return peekDashboardFrame1Snapshot(userId)?.forumUnreadCount ?? 0;
    });
    const onForumUnreadCount = useCallback(
        (count: number) => {
            const next = Number.isFinite(count) ? count : 0;
            setForumUnreadCount(next);
            patchDashboardFrame1Snapshot(userId, { forumUnreadCount: next });
        },
        [userId],
    );

    useEffect(() => {
        if (lazyIslandsReady) {
            markBootPhase('home-destination-reveal');
        }
    }, [lazyIslandsReady]);

    useEffect(() => {
        if (!userId || !visible) return;
        void import('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate')
            .then((m) => m.scheduleTransactionHubTileIdlePrefetch())
            .catch(() => undefined);
    }, [userId, visible]);

    const dockTasksWidgetVisible = useMemo(
        () => slots.some((slot) => slot.id === 'dockTasks'),
        [slots],
    );

    useEffect(() => {
        if (!userId || !dockTasksWidgetVisible) return;
        return scheduleIdleWork(
            () => {
                void import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm').then((m) =>
                    m.warmFieldTasksOnHover(),
                );
            },
            { minDelayMs: 80, timeoutMs: 2_500 },
        );
    }, [dockTasksWidgetVisible, userId]);

    const forumSignalsEnabled =
        Boolean(userId) && lazyIslandsReady && canUseNetworkFeatures(userId, userMetadata);

    const [pinnedCount, setPinnedCount] = useState(() => {
        const frame = peekFrame1Hydrate()?.pinnedCount ?? 0;
        if (frame > 0) return frame;
        return peekDashboardFrame1Snapshot(userId)?.pinnedCount ?? 0;
    });
    const [urgentAlertsCount, setUrgentAlertsCount] = useState(() => {
        const frame = peekFrame1Hydrate()?.urgentAlertsCount ?? 0;
        if (frame > 0) return frame;
        return peekDashboardFrame1Snapshot(userId)?.urgentAlertsCount ?? 0;
    });
    const unpinItemRef = useRef<(id: string, type: string) => void>(() => undefined);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let unsub: () => void = () => {};
        const cancelIdle = scheduleIdleWork(
            () => {
                void Promise.all([
                    import('@/app/stores/workspaceStore'),
                    import('@/app/services/alertTimeClassification'),
                ]).then(([ws, alerts]) => {
                    if (cancelled) return;
                    const syncPins = () => {
                        const items = ws.useWorkspaceStore.getState().pinnedItems;
                        const next = items.filter((p) => p.type !== 'hub').length;
                        setPinnedCount(next);
                        patchDashboardFrame1Snapshot(userId, { pinnedCount: next });
                    };
                    unpinItemRef.current = (id: string, type: string) => {
                        ws.useWorkspaceStore.getState().unpinItem(
                            id,
                            type as WorkspacePinnedItem['type'],
                        );
                    };
                    syncPins();
                    unsub = ws.useWorkspaceStore.subscribe(syncPins);
                    const urgent = alerts.classifySecretaryAlertsByHorizon(secretaryAlerts)
                        .urgentAlerts.length;
                    setUrgentAlertsCount(urgent);
                    patchDashboardFrame1Snapshot(userId, { urgentAlertsCount: urgent });
                });
            },
            { minDelayMs: import.meta.env.DEV ? 80 : 280, timeoutMs: 2_000 },
        );
        return () => {
            cancelled = true;
            cancelIdle();
            unsub();
        };
    }, [visible, secretaryAlerts, userId]);

    const dockAuthUserId = shellAuthUserId ?? userId;

    const prefetchForumIntent = useCallback(() => {
        void import('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch')
            .then((m) => m.prefetchDockWidgetIntent('forum'))
            .catch(() => undefined);
    }, []);

    const handleHubArchiveOpen = useCallback(
        (id: string) => {
            openHubArchiveFromHomeTile(id, dockAuthUserId, onOpenArchive);
        },
        [dockAuthUserId, onOpenArchive],
    );

    const dockActions = useCommandCenterDockActions({
        userId: dockAuthUserId,
        onOpenCalendar,
        onOpenFullNotepad,
        onOpenRepository,
        onOpenFieldTasksSheet,
        onOpenCommunity,
        onOpenArchive,
        onOpenVault,
        secretaryAlerts,
        onNavigateRoute,
        onOpenEntity,
        onUnpinItem: (id: string, type: string) => unpinItemRef.current(id, type),
        pinnedCount,
        urgentAlertsCount,
    });

    const dockBadgeContext = useMemo(
        (): DockShellBadgeContext => ({
            pendingFieldTasksCount,
            urgentAlertsCount,
            pinnedCount,
            forumUnreadCount,
        }),
        [pendingFieldTasksCount, urgentAlertsCount, pinnedCount, forumUnreadCount],
    );

    useEffect(() => {
        if (!visible) return;
        if (!consumePendingAlertsDockOpen()) return;
        dockActions.resolveDockWidgetClick('alerts', false)?.();
    }, [visible, dockActions]);

    const visibleMainDockWidgets = useMemo(
        () => slots.map((slot) => slot.id).filter((id) => SECONDARY_HOME_WIDGET_IDS.has(id)),
        [slots],
    );

    useEffect(() => {
        if (!visible || visibleMainDockWidgets.length === 0) return;
        const cancelLight = scheduleVisibleDockWidgetsPrefetch(visibleMainDockWidgets);
        const cancelHeavy = scheduleHeavyDockWidgetsIdlePrefetch(visibleMainDockWidgets);
        return () => {
            cancelLight();
            cancelHeavy();
        };
    }, [visible, visibleMainDockWidgets]);

    const hasWallpaper = Boolean(
        appearance.wallpaper ||
            appearance.wallpaperStamp ||
            (typeof document !== 'undefined' && document.documentElement.dataset.hamiWallpaper === '1'),
    );

    return {
        visible,
        announceBootReveal,
        themePrimary,
        appearance,
        slots,
        reduceMotion,
        commandHubTiles,
        forumUnreadCount,
        forumSignalsEnabled,
        lazyIslandsReady,
        dockAuthUserId,
        calendarUserId,
        clusterScanSources,
        secretaryAlerts,
        alertsLoading,
        alertsError,
        onNavigateRoute,
        onOpenEntity,
        onDismissAlert,
        onAlertResolved,
        handleHubArchiveOpen,
        prefetchForumIntent,
        dockActions,
        dockBadgeContext,
        hasWallpaper,
        userId,
        userMetadata,
        onOpenProfile,
        onPrimeProfile,
        onPrimeProfilePress,
        onForumUnreadCount,
    };
}

export type HomeTabContentModel = ReturnType<typeof useHomeTabContentModel>;
