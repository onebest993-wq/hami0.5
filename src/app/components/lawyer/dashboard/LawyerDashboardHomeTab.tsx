// @ts-nocheck
import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HomeFileTextIcon, HomeScaleIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey, ShapeKey } from '../LawyerShared';
import { ExecutionHero, DockHalfTile, ForumTile, RouteTile } from '@/app/components/lawyer/dashboard/commandHub';
import { HomeHubErrorBoundary } from '@/app/components/lawyer/dashboard/HomeHubErrorBoundary';
import { LawyerHomeTabErrorBoundary } from './LawyerHomeTabErrorBoundary';
import { HomeMainZoneErrorBoundary } from './HomeMainZoneErrorBoundary';
import { prefetchDockWidgetIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';
import {
    bindDockWidgetPointerHandlers,
    scheduleVisibleDockWidgetsPrefetch,
    scheduleHeavyDockWidgetsIdlePrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import { openHubArchiveFromHomeTile } from '@/app/services/hub/hubHomeOpen';
import type { CommandCenterNote } from '../commandCenterTypes';
import { LawyerHomeAmbient } from './LawyerHomeAmbient';
import { HOME_SCROLL, HOME_FLOW_COLUMN } from './lawyerHomeTheme';
import { HAMI_SHELL_CONTAINER } from './lawyerShellLayout';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import { scanHomeSparkHits } from '@/app/spark/engine/homeSparkAggregateScan';
import { countCalendarSparkAttention } from '@/app/spark/engine/calendarHomeSparkScan';
import { buildCalendarSparkSupplementalInput } from '@/app/spark/calendar/calendarSparkSupplementalScan';
import {
    countRepositoryAttentionFromHomeHits,
    resolveHubTileAttentionCountsFromHits,
} from '@/app/spark/engine/hubAttentionAggregate';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import {
    getWidgetsInZone,
    filterDisplayHomeWidgets,
    isRepositoryLegacyWidget,
    type HomeWidgetId,
} from '@/app/services/settings/homeLayout';
import { HOME_WIDGET_LABELS } from '@/app/services/settings/homeBlockLabels';
import {
    isBlockVisible,
    resolveWidgetSpan,
    resolveWidgetWrapperStyle,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { HomeLayoutScrollRoot } from './HomeLayoutScrollRoot';
import { useCommandCenterDockActions } from './useCommandCenterDockActions';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    useHomeDestinationReveal,
    useHomeLazyIslandsReveal,
    isHomeDestinationRevealedInSession,
} from '@/app/runtime/homeDestinationReveal';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { scheduleTransactionHubTileIdlePrefetch } from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';
import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { scheduleHomeMainGridPainted } from '@/app/bootstrap/homeMainGridPaintGate';
import { FIRST_TAB_OPEN_EVENT } from '@/app/bootstrap/bootReveal';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { prefetchLawyerHomeHubCard } from '@/app/utils/lazyComponents';
import { LawyerHomeHubCard } from '@/app/components/lawyer/LawyerHomeHubCard';

const LazyHomeForumSignalsIsland = lazyWithRetry(() =>
    import('./HomeForumSignalsIsland').then((m) => ({
        default: m.default as unknown as LazyComponent,
    })),
);

const LazyCommandCenterOverlays = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/CommandCenterOverlays').then((m) => ({
        default: m.CommandCenterOverlays as unknown as LazyComponent,
    })),
);

const SECONDARY_HOME_WIDGET_IDS = new Set<HomeWidgetId>([
    'dockRepository',
    'dockNotepad',
    'dockCalendar',
    'dockVault',
    'dockTasks',
]);

export type LawyerDashboardHomeTabProps = {
    visible: boolean;
    homeTabSessionKey?: number;
    homeDockChromeSessionKey?: number;
    calendarUserId: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading: boolean;
    alertsError: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert: (alertId: string) => void;
    onAlertResolved: (alert: SecretaryAlert) => void;
    onAcceptedConvertToCase: (alert: SecretaryAlert) => void;
    onOpenCommunity: () => void;
    theme: (typeof import('../LawyerShared').THEMES)[ThemeKey];
    shapeClass: (typeof import('../LawyerShared').SHAPES)[ShapeKey];
    onOpenArchive: (id: string) => void;
    userId: string;
    shellAuthUserId?: string | null;
    onOpenCalendar: () => void;
    onOpenFieldTasksSheet: () => void;
    pendingFieldTasksCount: number;
    onOpenFullNotepad: () => void;
    onOpenRepository?: (opts?: { tab?: 'notepad' | 'vault'; scanner?: boolean; notepadMode?: 'list' | 'create' }) => void;
    onOpenVault: () => void;
    fieldTasksSheetOpen?: boolean;
    showTasksManager?: boolean;
    onAddNote: (note: CommandCenterNote) => void;
};

function HomeTabContent({
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
    onAcceptedConvertToCase,
    onOpenCommunity,
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
    fieldTasksSheetOpen = false,
    showTasksManager = false,
    onAddNote,
}: LawyerDashboardHomeTabProps) {
    const reduceMotion = useReduceMotion();
    useHomeDestinationReveal(visible);
    const lazyIslandsReady = useHomeLazyIslandsReveal(visible);
    const homeSparkHits = useMemo(
        () => scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 12, maxTotal: 48 }),
        [clusterScanSources],
    );
    const hubTileAttention = useMemo(
        () => resolveHubTileAttentionCountsFromHits(homeSparkHits, secretaryAlerts),
        [homeSparkHits, secretaryAlerts],
    );
    const repositorySparkAttentionCount = useMemo(
        () => countRepositoryAttentionFromHomeHits(homeSparkHits),
        [homeSparkHits],
    );
    const calendarSparkAttentionCount = useMemo(
        () =>
            countCalendarSparkAttention(
                clusterScanSources.calendarEvents ?? [],
                buildCalendarSparkSupplementalInput(clusterScanSources, secretaryAlerts),
            ),
        [clusterScanSources, secretaryAlerts],
    );
    const { settings } = useLawyerSettings();
    const { placements, overrides } = settings.homeLayout;
    const themePrimary = theme.primary ?? '#E6C673';
    const accent = themePrimary;
    const secondaryAccent = theme.secondary ?? '#B8943F';
    const defaultGlassOpacity = settings.appearance.glassOpacity;

    const mainWidgets = useMemo(
        () => filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), false),
        [placements],
    );
    const [forumUnreadCount, setForumUnreadCount] = useState(0);
    const [forumUnreadLoading, setForumUnreadLoading] = useState(false);
    const firstTabOpenMarkedRef = useRef(false);
    const homeGridRef = useRef<HTMLDivElement | null>(null);
    const setHomeGridRef = useCallback((node: HTMLDivElement | null) => {
        homeGridRef.current = node;
        if (node) {
            scheduleHomeMainGridPainted(node);
        }
    }, []);
    const onForumUnreadCount = useCallback((count: number) => {
        setForumUnreadCount(Number.isFinite(count) ? count : 0);
    }, []);
    const onForumUnreadLoading = useCallback((loading: boolean) => {
        setForumUnreadLoading(loading);
    }, []);

    useLayoutEffect(() => {
        if (!visible) return;
        prefetchLawyerHomeHubCard();
        if (firstTabOpenMarkedRef.current) return;
        firstTabOpenMarkedRef.current = true;
        markBootPhase('first-tab-open');
        try {
            window.dispatchEvent(new Event(FIRST_TAB_OPEN_EVENT));
        } catch {
            /* ignore */
        }
    }, [visible]);

    useLayoutEffect(() => {
        scheduleHomeMainGridPainted(homeGridRef.current);
        return undefined;
    }, [visible]);

    useEffect(() => {
        if (lazyIslandsReady) {
            markBootPhase('home-destination-reveal');
        }
    }, [lazyIslandsReady]);

    useEffect(() => {
        if (!userId || !visible) return;
        scheduleTransactionHubTileIdlePrefetch();
    }, [userId, visible]);

    const dockTasksWidgetVisible = useMemo(() => {
        return mainWidgets.some((id) => id === 'dockTasks' && isBlockVisible(overrides[id]));
    }, [mainWidgets, overrides]);

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

    const forumSignalsEnabled = Boolean(userId) && lazyIslandsReady;

    /** بعد first-tab — لا تسحب workspaceStore/classify إلى تقييم HomeTab الحرج */
    const [pinnedCount, setPinnedCount] = useState(0);
    const [urgentAlertsCount, setUrgentAlertsCount] = useState(0);
    const unpinItemRef = useRef<(id: string) => void>(() => undefined);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let unsub = () => undefined;
        const cancelIdle = scheduleIdleWork(
            () => {
                void Promise.all([
                    import('@/app/stores/workspaceStore'),
                    import('@/app/services/alertTimeClassification'),
                ]).then(([ws, alerts]) => {
                    if (cancelled) return;
                    const syncPins = () => {
                        const items = ws.useWorkspaceStore.getState().pinnedItems;
                        setPinnedCount(items.filter((p) => p.type !== 'hub').length);
                    };
                    unpinItemRef.current = (id: string) => {
                        ws.useWorkspaceStore.getState().unpinItem(id);
                    };
                    syncPins();
                    unsub = ws.useWorkspaceStore.subscribe(syncPins);
                    setUrgentAlertsCount(
                        alerts.classifySecretaryAlertsByHorizon(secretaryAlerts).urgentAlerts
                            .length,
                    );
                });
            },
            { minDelayMs: import.meta.env.DEV ? 80 : 280, timeoutMs: 2_000 },
        );
        return () => {
            cancelled = true;
            cancelIdle();
            unsub();
        };
    }, [visible, secretaryAlerts]);

    const dockAuthUserId = shellAuthUserId ?? userId;

    const prefetchForumIntent = useCallback(() => {
        prefetchDockWidgetIntent('forum');
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
        onAddNote,
        onOpenArchive,
        onOpenVault,
        secretaryAlerts,
        onNavigateRoute,
        onOpenEntity,
        onUnpinItem: (id: string) => unpinItemRef.current(id),
        pinnedCount,
        urgentAlertsCount,
    });

    const dockBadgeContext = useMemo(
        () => ({
            pendingFieldTasksCount,
            urgentAlertsCount,
            pinnedCount,
            forumUnreadCount,
            repositorySparkAttentionCount,
            calendarSparkAttentionCount,
        }),
        [
            pendingFieldTasksCount,
            urgentAlertsCount,
            pinnedCount,
            forumUnreadCount,
            repositorySparkAttentionCount,
            calendarSparkAttentionCount,
        ],
    );

    const visibleMainDockWidgets = useMemo(
        () =>
            mainWidgets.filter(
                (id) =>
                    SECONDARY_HOME_WIDGET_IDS.has(id) &&
                    !isRepositoryLegacyWidget(id) &&
                    isBlockVisible(overrides[id]),
            ),
        [mainWidgets, overrides],
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

    const widgetVisible = (id: HomeWidgetId) => {
        if (id === 'dockQuickNote') return false;
        if (isRepositoryLegacyWidget(id)) return false;
        return isBlockVisible(overrides[id]);
    };

    const renderWidgetBody = (id: HomeWidgetId) => {
        const ov = overrides[id];
        const layoutSpan = id === 'forum' ? 2 : resolveWidgetSpan(id, ov);

        switch (id) {
            case 'alerts':
                return (
                    <HomeHubErrorBoundary>
                        <LawyerHomeHubCard
                            lawyerId={calendarUserId}
                            shellAuthUserId={dockAuthUserId}
                            clusterScanSources={clusterScanSources}
                            secretaryAlerts={secretaryAlerts}
                            alertsLoading={alertsLoading}
                            alertsError={alertsError}
                            onNavigateRoute={onNavigateRoute}
                            onOpenEntity={onOpenEntity}
                            onDismissAlert={onDismissAlert}
                            onResolved={onAlertResolved}
                            onAcceptedConvertToCase={onAcceptedConvertToCase}
                            blockOverride={ov}
                            themePrimary={themePrimary}
                        />
                    </HomeHubErrorBoundary>
                );
            case 'hubExecution':
                return (
                    <ExecutionHero
                        accent={accent}
                        onOpenArchive={handleHubArchiveOpen}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={false}
                        layoutSpan={layoutSpan}
                        proceduralAttentionCount={hubTileAttention.execution}
                    />
                );
            case 'hubLawsuit':
                return (
                    <RouteTile
                        card={{ id: 'lawsuit', tileId: 'hubLawsuit', label: 'دعاوى', icon: HomeScaleIcon, accent }}
                        onOpenArchive={handleHubArchiveOpen}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={false}
                        layoutSpan={layoutSpan}
                        proceduralAttentionCount={hubTileAttention.lawsuit}
                    />
                );
            case 'hubTransaction':
                return (
                    <RouteTile
                        card={{
                            id: 'transaction',
                            tileId: 'hubTransaction',
                            label: 'معاملات',
                            icon: HomeFileTextIcon,
                            accent: secondaryAccent,
                        }}
                        onOpenArchive={handleHubArchiveOpen}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={false}
                        layoutSpan={layoutSpan}
                        proceduralAttentionCount={hubTileAttention.transaction}
                    />
                );
            case 'forum':
                return (
                    <ForumTile
                        forumUnreadCount={forumUnreadCount}
                        forumUnreadLoading={forumUnreadLoading}
                        onOpen={() => dockActions.resolveDockWidgetClick('forum', false)?.()}
                        onPrefetch={prefetchForumIntent}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={false}
                        layoutSpan={layoutSpan}
                    />
                );
            case 'dockRepository':
            case 'dockNotepad':
            case 'dockCalendar':
            case 'dockVault':
            case 'dockTasks': {
                const onDockClick = dockActions.resolveDockWidgetClick(id, false);
                const dockTitle = HOME_WIDGET_LABELS[id];
                return (
                    <DockHalfTile
                        widgetId={id}
                        label={dockTitle}
                        onOpen={() => onDockClick?.()}
                        prefetchHandlers={bindDockWidgetPointerHandlers(id)}
                        badgeContext={dockBadgeContext}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={false}
                        layoutSpan={layoutSpan}
                    />
                );
            }
            default:
                return null;
        }
    };

    const mainBottomPad = 'pb-6';
    const hasWallpaper = Boolean(
        settings.appearance.wallpaper ||
            settings.appearance.wallpaperStamp ||
            (typeof document !== 'undefined' && document.documentElement.dataset.hamiWallpaper === '1'),
    );
    const instantHomeReveal =
        isHomeDestinationRevealedInSession() ||
        (typeof document !== 'undefined' && document.documentElement.dataset.hamiInitialBoot === '1');

    return (
        <div
            className={HOME_FLOW_COLUMN}
            data-testid="lawyer-home-tab-content"
            data-hami-home-destination-ready={visible ? '1' : '0'}
        >
            <LawyerHomeAmbient wallpaperActive={hasWallpaper} />
            {lazyIslandsReady && isBootRevealDone() && forumSignalsEnabled ? (
                <Suspense fallback={null}>
                    <LazyHomeForumSignalsIsland
                        userId={userId}
                        enabled={forumSignalsEnabled}
                        onUnreadCount={onForumUnreadCount}
                        onLoadingChange={onForumUnreadLoading}
                    />
                </Suspense>
            ) : null}
            {lazyIslandsReady && isBootRevealDone() ? (
                <Suspense fallback={null}>
                    <LazyCommandCenterOverlays
                        userId={dockAuthUserId}
                        actions={dockActions}
                        onNavigateRoute={onNavigateRoute}
                    />
                </Suspense>
            ) : null}
            <div
                data-testid="home-main-zone"
                aria-hidden={!visible}
                className={`${HOME_SCROLL} ${
                    instantHomeReveal
                        ? 'hami-home-destination-reveal--instant'
                        : 'hami-home-destination-reveal'
                }${visible ? '' : ' invisible pointer-events-none'}`}
            >
                <div
                    className={`${HAMI_SHELL_CONTAINER} w-full ${mainBottomPad}`}
                >
                    <HomeMainZoneErrorBoundary>
                    <div
                        ref={setHomeGridRef}
                        className="grid grid-cols-2 gap-3.5"
                        data-testid="home-main-grid"
                    >
                    {mainWidgets.flatMap((widgetId) => {
                        if (!widgetVisible(widgetId)) return [];
                        const span =
                            widgetId === 'forum'
                                ? 2
                                : resolveWidgetSpan(widgetId, overrides[widgetId]);
                        const style = resolveWidgetWrapperStyle(
                            widgetId,
                            overrides[widgetId],
                            themePrimary,
                            'main',
                            defaultGlassOpacity,
                            settings.appearance,
                        );
                        return [
                            <div
                                key={widgetId}
                                data-hami-widget-slot=""
                                className={span === 2 ? 'col-span-2' : undefined}
                                style={style}
                                data-hami-layout-span={span}
                            >
                                {renderWidgetBody(widgetId)}
                            </div>,
                        ];
                    })}
                    </div>
                    </HomeMainZoneErrorBoundary>
                </div>
            </div>
        </div>
    );
}

export function LawyerDashboardHomeTab({
    visible,
    ...rest
}: LawyerDashboardHomeTabProps) {
    return (
        <div
            className="absolute inset-x-0 hami-below-lawyer-header bottom-0 z-[1]"
            data-testid="lawyer-home-tab"
            aria-hidden={!visible}
        >
            <HomeLayoutScrollRoot>
                <LawyerHomeTabErrorBoundary>
                    <HomeTabContent visible={visible} {...rest} />
                </LawyerHomeTabErrorBoundary>
            </HomeLayoutScrollRoot>
        </div>
    );
}
