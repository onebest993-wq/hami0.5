// @ts-nocheck
import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Book,
    Calendar as CalendarIcon,
    FolderOpen,
    ListChecks,
    MessageCircle,
    Scale,
    FileText,
    Warehouse,
} from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey, ShapeKey } from '../LawyerShared';
import { ExecutionHero, RouteTile } from '@/app/components/lawyer/dashboard/commandHub';
import { HomeHubErrorBoundary } from '@/app/components/lawyer/LawyerHomeHubCard/HomeHubErrorBoundary';
import { HomeDockChromeErrorBoundary } from './HomeDockChromeErrorBoundary';
import { LawyerHomeTabErrorBoundary } from './LawyerHomeTabErrorBoundary';
import { HomeMainZoneErrorBoundary } from './HomeMainZoneErrorBoundary';
import { prefetchDockWidgetIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';
import { openHubArchiveFromHomeTile } from '@/app/services/hub/hubHomeOpen';
import {
    formatForumUnreadBadge,
    resolveForumShellAriaLabel,
    shouldShowForumUnreadBadge,
} from '@/app/services/forum/forumShellNavigation';
import { classifySecretaryAlertsByHorizon } from '@/app/services/alertTimeClassification';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { CommandCenterNote } from '../commandCenterTypes';
import { LawyerHomeAmbient } from './LawyerHomeAmbient';
import { HOME_SCROLL, HOME_FLOW_COLUMN } from './lawyerHomeTheme';
import { HAMI_SHELL_CONTAINER } from './lawyerShellLayout';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { resolveWallpaperSrc } from '@/app/services/settings';
import {
    getWidgetsInZone,
    transferWidget,
    reorderWidgetInZone,
    getWidgetZone,
    filterDisplayHomeWidgets,
    isRepositoryLegacyWidget,
    type HomeWidgetId,
    type HomeWidgetZone,
} from '@/app/services/settings/homeLayout';
import { HOME_WIDGET_LABELS } from '@/app/services/settings/homeBlockLabels';
import {
    isBlockVisible,
    adaptWidgetStyleForZoneChange,
    resolveHomeBlockAccent,
    resolveWidgetSpan,
    resolveWidgetWrapperStyle,
} from '@/app/services/settings/resolveHomeBlockStyle';
import {
    dockCardIconBoxPx,
    dockCardLabelRem,
    dockIconStrokePx,
    forumIconBoxPx,
    forumIconStrokePx,
    forumLabelRem,
    resolveBlockSizeScale,
} from '@/app/services/settings/homeBlockScale';
import { HomeBlockShell } from './HomeBlockShell';
import { HomeLayoutEditProvider } from './homeLayoutEdit/HomeLayoutEditContext';
import { HomeLayoutEditChrome } from './homeLayoutEdit/HomeLayoutEditChrome';
import { DraggableHomeWidget } from './homeLayoutEdit/DraggableHomeWidget';
import { HomeDropZone } from './homeLayoutEdit/HomeDropZone';
import { HomeDropIndicator } from './homeLayoutEdit/HomeDropIndicator';
import { HomeLayoutScrollRoot, useHomePageScroll } from './homeLayoutEdit/HomeLayoutScrollRoot';
import { HomeDockTransferHint } from './homeLayoutEdit/HomeDockTransferHint';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { useCommandCenterDockActions } from './useCommandCenterDockActions';
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { useViewportShellScale } from '@/app/hooks/useViewportShellScale';
import { scheduleTransactionHubTileIdlePrefetch } from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';
import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { notifyBootContentReady } from '@/app/bootstrap/bootReveal';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { resolveDockShellMetrics, scaleDockShellMetrics } from '@/app/services/settings/dockShellLayout';
import {
    estimateDockChromeOccupiedPx,
    resolveDockChromeScrollPadPx,
    resolveDockChromeStackGapPx,
} from '@/app/services/settings/homeDockChromeLayout';

const LazyLawyerHomeHubCard = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawyerHomeHubCard').then((m) => ({
        default: m.LawyerHomeHubCard as unknown as LazyComponent,
    })),
);

const LazyLegalCommandCenterDock = lazyWithRetry(() =>
    import('@/app/components/lawyer/LegalCommandCenterDock').then((m) => ({
        default: m.LegalCommandCenterDock as unknown as LazyComponent,
    })),
);

const LazyCommandCenterOverlays = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/CommandCenterOverlays').then((m) => ({
        default: m.CommandCenterOverlays as unknown as LazyComponent,
    })),
);

const PRIMARY_HOME_WIDGET_IDS = new Set<HomeWidgetId>([
    'hubExecution',
    'hubLawsuit',
    'hubTransaction',
    'forum',
]);

const SECONDARY_HOME_WIDGET_IDS = new Set<HomeWidgetId>([
    'dockRepository',
    'dockNotepad',
    'dockCalendar',
    'dockVault',
    'dockTasks',
]);

const HOME_STAGE_DELAYS = {
    overlays: { minDelayMs: 180, timeoutMs: 1_000 },
    forumSignals: { minDelayMs: 60, timeoutMs: 500 },
} as const;
export type LawyerDashboardHomeTabProps = {
    visible: boolean;
    homeTabSessionKey?: number;
    homeHubCardSessionKey?: number;
    homeDockChromeSessionKey?: number;
    homeLayoutEditMode?: boolean;
    onExitHomeLayoutEdit?: () => void;
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
    onAddNote: (note: CommandCenterNote) => void;
};

function HomeHubStageFallback() {
    return (
        <div className="min-h-[280px] rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 animate-pulse" />
    );
}

function HomeDockStageFallback() {
    return (
        <div className="w-full min-h-[98px] rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 animate-pulse" />
    );
}

function HomeWidgetStageFallback({ span = 1 }: { span?: 1 | 2 }) {
    return (
        <div
            className={`rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 animate-pulse ${
                span === 2 ? 'min-h-[9.5rem]' : 'min-h-[5.75rem]'
            }`}
        />
    );
}

function HomeTabContent({
    visible,
    homeLayoutEditMode,
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
    onAddNote,
}: Omit<LawyerDashboardHomeTabProps, 'onExitHomeLayoutEdit'>) {
    const reduceMotion = useReduceMotion();
    const { settings } = useLawyerSettings();
    const { patchBlockOverride } = useSettingsPatches();
    const { placements, dockVisible, overrides } = settings.homeLayout;
    const themePrimary = theme.primary ?? '#E6C673';
    const accent = themePrimary;
    const secondaryAccent = theme.secondary ?? '#B8943F';
    const defaultGlassOpacity = settings.appearance.glassOpacity;

    const mainWidgets = useMemo(
        () => filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), homeLayoutEditMode),
        [placements, homeLayoutEditMode],
    );
    const dockWidgets = useMemo(() => getWidgetsInZone(placements, 'dock'), [placements]);
    const [forumSignalsReady, setForumSignalsReady] = useState(false);
    const [alertsStageReady, setAlertsStageReady] = useState(true);
    const [secondaryWidgetsStageReady, setSecondaryWidgetsStageReady] = useState(true);
    const [forumStageReady, setForumStageReady] = useState(true);
    const [dockStageReady, setDockStageReady] = useState(true);
    const [overlaysStageReady, setOverlaysStageReady] = useState(homeLayoutEditMode);
    const firstTabOpenMarkedRef = useRef(false);
    const enableForumSignals = useCallback(() => setForumSignalsReady(true), []);

    useEffect(() => {
        if (!visible) return;
        setAlertsStageReady(true);
        setSecondaryWidgetsStageReady(true);
        setForumStageReady(true);
        setDockStageReady(true);
        if (homeLayoutEditMode) {
            setOverlaysStageReady(true);
            return;
        }

        const cancelOverlays = overlaysStageReady
            ? undefined
            : scheduleIdleWork(() => setOverlaysStageReady(true), {
                  ...HOME_STAGE_DELAYS.overlays,
              });

        return () => {
            cancelOverlays?.();
        };
    }, [
        overlaysStageReady,
        homeLayoutEditMode,
        visible,
    ]);

    useLayoutEffect(() => {
        if (!visible || firstTabOpenMarkedRef.current) return;
        firstTabOpenMarkedRef.current = true;
        markBootPhase('first-tab-open');
        notifyBootContentReady();
    }, [visible]);

    useEffect(() => {
        if (!userId || homeLayoutEditMode || !forumStageReady || forumSignalsReady) return;
        return scheduleIdleWork(
            () => setForumSignalsReady(true),
            HOME_STAGE_DELAYS.forumSignals,
        );
    }, [forumSignalsReady, forumStageReady, homeLayoutEditMode, userId]);

    useEffect(() => {
        if (!userId || homeLayoutEditMode || !dockStageReady) return;
        scheduleTransactionHubTileIdlePrefetch();
    }, [dockStageReady, homeLayoutEditMode, userId]);

    const forumUnreadCount = useForumUnreadCount(userId, !homeLayoutEditMode && forumSignalsReady);
    useForumNotificationStream(userId, !homeLayoutEditMode && forumSignalsReady);
    const pinnedCount = useWorkspaceStore((s) => s.pinnedItems.filter((p) => p.type !== 'hub').length);
    const unpinItem = useWorkspaceStore((s) => s.unpinItem);
    const urgentAlertsCount = useMemo(() => {
        const classified = classifySecretaryAlertsByHorizon(secretaryAlerts);
        return classified.urgentAlerts.length;
    }, [secretaryAlerts]);

    const dockAuthUserId = shellAuthUserId ?? userId;

    const prefetchForumIntent = useCallback(() => {
        enableForumSignals();
        prefetchDockWidgetIntent('forum');
    }, [enableForumSignals]);

    const handleHubArchiveOpen = useCallback(
        (id: string) => {
            if (homeLayoutEditMode) return;
            openHubArchiveFromHomeTile(id, dockAuthUserId, onOpenArchive);
        },
        [homeLayoutEditMode, dockAuthUserId, onOpenArchive],
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
        onUnpinItem: unpinItem,
        pinnedCount,
        urgentAlertsCount,
    });

    const widgetVisible = (id: HomeWidgetId) => {
        if (id === 'dockQuickNote') return false;
        if (!homeLayoutEditMode && isRepositoryLegacyWidget(id)) return false;
        return homeLayoutEditMode || isBlockVisible(overrides[id]);
    };

    const renderWidgetBody = (id: HomeWidgetId) => {
        const ov = overrides[id];
        const layoutSpan = resolveWidgetSpan(id, ov);
        const deferredFallback =
            id === 'alerts' ? <HomeHubStageFallback /> : <HomeWidgetStageFallback span={layoutSpan} />;
        const primaryWidget = PRIMARY_HOME_WIDGET_IDS.has(id);
        const secondaryWidget = SECONDARY_HOME_WIDGET_IDS.has(id);
        const shouldDeferAlerts = id === 'alerts' && !alertsStageReady && !homeLayoutEditMode;
        const shouldDeferSecondary =
            secondaryWidget && !secondaryWidgetsStageReady && !homeLayoutEditMode;
        const shouldDeferForum = id === 'forum' && !forumStageReady && !homeLayoutEditMode;

        if (!primaryWidget && (shouldDeferAlerts || shouldDeferSecondary || shouldDeferForum)) {
            return deferredFallback;
        }

        switch (id) {
            case 'alerts':
                return (
                    <HomeHubErrorBoundary>
                        <Suspense fallback={<HomeHubStageFallback />}>
                            <LazyLawyerHomeHubCard
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
                                layoutEditMode={homeLayoutEditMode}
                            />
                        </Suspense>
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
                        interactionDisabled={homeLayoutEditMode}
                        layoutSpan={layoutSpan}
                    />
                );
            case 'hubLawsuit':
                return (
                    <RouteTile
                        card={{ id: 'lawsuit', tileId: 'hubLawsuit', label: 'دعاوى', icon: Scale, accent }}
                        onOpenArchive={handleHubArchiveOpen}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={homeLayoutEditMode}
                        layoutSpan={layoutSpan}
                    />
                );
            case 'hubTransaction':
                return (
                    <RouteTile
                        card={{
                            id: 'transaction',
                            tileId: 'hubTransaction',
                            label: 'معاملات',
                            icon: FileText,
                            accent: secondaryAccent,
                        }}
                        onOpenArchive={handleHubArchiveOpen}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={homeLayoutEditMode}
                        layoutSpan={layoutSpan}
                    />
                );
            case 'forum': {
                const forumAccent = resolveHomeBlockAccent(ov, themePrimary);
                const forumSize = ov?.size ?? 'normal';
                const forumBox = forumIconBoxPx(forumSize);
                const forumIcon = forumIconStrokePx(forumSize);
                const forumLabel = forumLabelRem(forumSize);
                const forumUnreadBadgeVisible =
                    shouldShowForumUnreadBadge(forumUnreadCount) && !homeLayoutEditMode;
                const onForumPrefetch = homeLayoutEditMode ? undefined : prefetchForumIntent;
                return (
                    <HomeBlockShell
                        blockId="forum"
                        override={ov}
                        themePrimary={themePrimary}
                        inheritContentScale
                        as="button"
                        type="button"
                        aria-label={resolveForumShellAriaLabel(forumUnreadCount, {
                            layoutEditMode: homeLayoutEditMode,
                        })}
                        data-testid="home-dock-forum"
                        onClick={
                            homeLayoutEditMode
                                ? undefined
                                : () => dockActions.resolveDockWidgetClick('forum', false)?.()
                        }
                        onPointerEnter={onForumPrefetch}
                        onPointerDown={onForumPrefetch}
                        onFocus={onForumPrefetch}
                        disabled={homeLayoutEditMode}
                        tabIndex={homeLayoutEditMode ? -1 : 0}
                        className={`group relative w-full px-4 py-3.5 flex items-center text-right ${
                            homeLayoutEditMode ? '' : 'active:opacity-[0.88] active:scale-[0.985] transition-all duration-300'
                        }`}
                    >
                        {forumUnreadBadgeVisible ? (
                            <span
                                className="absolute top-2.5 left-3 z-[2] min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg tabular-nums"
                                aria-hidden
                            >
                                {formatForumUnreadBadge(forumUnreadCount)}
                            </span>
                        ) : null}
                        <div className="relative flex items-center gap-3.5 min-w-0 flex-1">
                            <div
                                className="rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    width: `calc(${forumBox}px * var(--hami-content-scale, 1))`,
                                    height: `calc(${forumBox}px * var(--hami-content-scale, 1))`,
                                    border: `1px solid color-mix(in srgb, ${forumAccent} 35%, transparent)`,
                                    background: `color-mix(in srgb, ${forumAccent} 16%, transparent)`,
                                    color: forumAccent,
                                }}
                                aria-hidden
                            >
                                <MessageCircle
                                    strokeWidth={1.6}
                                    style={{
                                        width: `calc(${forumIcon}px * var(--hami-content-scale, 1))`,
                                        height: `calc(${forumIcon}px * var(--hami-content-scale, 1))`,
                                    }}
                                />
                            </div>
                            <p
                                dir="rtl"
                                lang="ar"
                                className="font-['Cairo'] font-bold leading-tight"
                                style={{
                                    fontSize: `calc(${forumLabel}rem * var(--hami-content-scale, 1))`,
                                    color: '#F0D4BC',
                                    textShadow: `0 2px 14px color-mix(in srgb, ${forumAccent} 35%, transparent)`,
                                }}
                                aria-hidden
                                data-hami-edit-hide-in-layout={homeLayoutEditMode || undefined}
                            >
                                المنتدى القانوني
                            </p>
                        </div>
                    </HomeBlockShell>
                );
            }
            case 'dockRepository':
            case 'dockNotepad':
            case 'dockCalendar':
            case 'dockVault':
            case 'dockTasks': {
                const icons = {
                    dockRepository: Warehouse,
                    dockNotepad: Warehouse,
                    dockCalendar: CalendarIcon,
                    dockVault: Warehouse,
                    dockTasks: ListChecks,
                };
                const Icon = icons[id];
                const dockAccent = resolveHomeBlockAccent(ov, themePrimary);
                const dockSize = ov?.size ?? 'normal';
                const dockBox = dockCardIconBoxPx(dockSize);
                const dockIcon = dockIconStrokePx(dockSize);
                const dockLabelRem = dockCardLabelRem(dockSize);
                const onDockClick = dockActions.resolveDockWidgetClick(id, homeLayoutEditMode);
                const onDockPrefetch = homeLayoutEditMode
                    ? undefined
                    : () => prefetchDockWidgetIntent(id);
                const dockTitle = HOME_WIDGET_LABELS[id];
                const showTasksBadge = id === 'dockTasks' && pendingFieldTasksCount > 0;
                return (
                    <HomeBlockShell
                        blockId={id}
                        override={ov}
                        themePrimary={themePrimary}
                        inheritContentScale
                        as="button"
                        type="button"
                        aria-label={dockTitle}
                        data-testid={`home-dock-${id}`}
                        onClick={onDockClick}
                        onPointerEnter={onDockPrefetch}
                        onPointerDown={onDockPrefetch}
                        onFocus={onDockPrefetch}
                        disabled={homeLayoutEditMode}
                        tabIndex={homeLayoutEditMode ? -1 : 0}
                        className={`group w-full px-4 py-4 flex items-center gap-3 text-right min-h-[100px] ${
                            homeLayoutEditMode ? '' : 'active:opacity-[0.88] active:scale-[0.985] transition-all duration-300'
                        }`}
                    >
                        {showTasksBadge ? (
                            <span
                                className="absolute top-3 left-3 rounded-full bg-rose-500 ring-2 ring-[#060608]"
                                style={{
                                    width: `calc(8px * var(--hami-content-scale, 1))`,
                                    height: `calc(8px * var(--hami-content-scale, 1))`,
                                }}
                                aria-hidden
                            />
                        ) : null}
                        <div
                            className="rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                width: `calc(${dockBox}px * var(--hami-content-scale, 1))`,
                                height: `calc(${dockBox}px * var(--hami-content-scale, 1))`,
                                background: `color-mix(in srgb, ${dockAccent} 14%, rgba(255,255,255,0.05))`,
                                border: `1px solid color-mix(in srgb, ${dockAccent} 30%, transparent)`,
                                color: dockAccent,
                            }}
                            aria-hidden
                        >
                            <Icon
                                style={{
                                    width: `calc(${dockIcon}px * var(--hami-content-scale, 1))`,
                                    height: `calc(${dockIcon}px * var(--hami-content-scale, 1))`,
                                }}
                            />
                        </div>
                        <p
                            className="font-bold text-white/90"
                            style={{
                                fontSize: `calc(${dockLabelRem}rem * var(--hami-content-scale, 1))`,
                            }}
                            aria-hidden
                            data-hami-edit-hide-in-layout={homeLayoutEditMode || undefined}
                        >
                            {dockTitle}
                        </p>
                    </HomeBlockShell>
                );
            }
            default:
                return null;
        }
    };

    const showDockShell = !fieldTasksSheetOpen && (dockVisible || homeLayoutEditMode);
    const showShellZone = showDockShell;
    const showBottomChrome = showShellZone || homeLayoutEditMode;
    const { dockSticky } = useHomePageScroll();
    const viewportShellScale = useViewportShellScale();
    const compactDockWidgets = useMemo(
        () =>
            filterDisplayHomeWidgets(
                dockWidgets.filter((id) => id !== 'dockQuickNote'),
                homeLayoutEditMode,
            ),
        [dockWidgets, homeLayoutEditMode],
    );
    const visibleShellWidgetCount = useMemo(
        () =>
            Math.max(
                1,
                compactDockWidgets.filter((id) => homeLayoutEditMode || isBlockVisible(overrides[id]))
                    .length,
            ),
        [compactDockWidgets, homeLayoutEditMode, overrides],
    );
    const dockShellMetrics = useMemo(
        () =>
            scaleDockShellMetrics(
                scaleDockShellMetrics(
                    resolveDockShellMetrics(visibleShellWidgetCount),
                    viewportShellScale,
                ),
                resolveBlockSizeScale(overrides.dockShell?.size),
            ),
        [visibleShellWidgetCount, viewportShellScale, overrides.dockShell?.size],
    );
    const shellLiftPx = overrides.dockShell?.dockLiftPx ?? 0;
    const dockChromeLiftPx = Math.max(0, shellLiftPx);
    const dockChromeStackGapPx = resolveDockChromeStackGapPx({ shellVisible: showShellZone });
    const dockChromeOccupiedPx = estimateDockChromeOccupiedPx({
        visibility: { shellVisible: showShellZone },
        shellMetrics: dockShellMetrics,
        stackGapPx: dockChromeStackGapPx,
        chromeLiftPx: dockChromeLiftPx,
    });
    const dockScrollPadPx = resolveDockChromeScrollPadPx(dockChromeOccupiedPx);
    const dockScrollPadStyle = showBottomChrome
        ? ({
              '--hami-home-dock-scroll-pad': `${dockScrollPadPx}px`,
              '--hami-dock-chrome-stack-gap': `${dockChromeStackGapPx}px`,
          } as React.CSSProperties)
        : undefined;
    const hasWallpaper = Boolean(resolveWallpaperSrc(settings.appearance));

    const mainBottomPad =
        showBottomChrome && (dockSticky || homeLayoutEditMode)
            ? homeLayoutEditMode
                ? 'hami-home-edit-layout-pad'
                : 'hami-home-dock-scroll-pad'
            : showBottomChrome
              ? 'pb-2'
              : 'pb-6';

    return (
        <div className={`${HOME_FLOW_COLUMN}${homeLayoutEditMode ? ' hami-home-layout-editing' : ''}`} data-testid="lawyer-home-tab-content">
            <LawyerHomeAmbient wallpaperActive={hasWallpaper} />
            {homeLayoutEditMode ? <HomeLayoutEditChrome /> : null}
            <HomeDropIndicator />
            <HomeDockTransferHint />
            {overlaysStageReady || homeLayoutEditMode ? (
                <Suspense fallback={null}>
                    <LazyCommandCenterOverlays
                        userId={dockAuthUserId}
                        actions={dockActions}
                        onNavigateRoute={onNavigateRoute}
                    />
                </Suspense>
            ) : null}
            <HomeDropZone
                zone="main"
                testId="home-main-zone"
                className={`${HOME_SCROLL} ${homeLayoutEditMode ? 'hami-home-edit-content-pad' : ''}`}
            >
                <div
                    className={`${HAMI_SHELL_CONTAINER} w-full ${mainBottomPad}`}
                    style={dockScrollPadStyle}
                >
                    <HomeMainZoneErrorBoundary>
                    <div className="grid grid-cols-2 gap-3.5" data-testid="home-main-grid">
                    {mainWidgets.flatMap((widgetId) => {
                        if (!widgetVisible(widgetId)) return [];
                        const span = resolveWidgetSpan(widgetId, overrides[widgetId]);
                        const hidden = !isBlockVisible(overrides[widgetId]);
                        const style = resolveWidgetWrapperStyle(
                            widgetId,
                            overrides[widgetId],
                            themePrimary,
                            'main',
                            defaultGlassOpacity,
                        );
                        return [
                            <div
                                key={widgetId}
                                data-hami-widget-slot=""
                                className={span === 2 ? 'col-span-2' : undefined}
                                style={style}
                                data-hami-layout-span={span}
                            >
                                <DraggableHomeWidget
                                    widgetId={widgetId}
                                    zone="main"
                                    label={HOME_WIDGET_LABELS[widgetId]}
                                    className={hidden && homeLayoutEditMode ? 'opacity-45' : ''}
                                    blockOverride={overrides[widgetId]}
                                    currentSpan={span}
                                    onResizeSpan={
                                        widgetId === 'alerts' || widgetId === 'forum'
                                            ? undefined
                                            : (nextSpan) =>
                                                  patchBlockOverride(widgetId, {
                                                      span: nextSpan,
                                                      heightPx: undefined,
                                                  })
                                    }
                                >
                                    {renderWidgetBody(widgetId)}
                                </DraggableHomeWidget>
                            </div>,
                        ];
                    })}
                    </div>
                    </HomeMainZoneErrorBoundary>
                </div>
            </HomeDropZone>
            {showBottomChrome ? (
                <div className="hami-home-bottom-chrome" data-testid="home-bottom-chrome">
                <HomeDockChromeErrorBoundary>
                {dockStageReady || homeLayoutEditMode ? (
                    <Suspense fallback={<HomeDockStageFallback />}>
                        <LazyLegalCommandCenterDock
                            shellVisible={showShellZone}
                            userId={dockAuthUserId}
                            dockActions={dockActions}
                            onOpenCalendar={onOpenCalendar}
                            onOpenFieldTasksSheet={onOpenFieldTasksSheet}
                            pendingFieldTasksCount={pendingFieldTasksCount}
                            urgentAlertsCount={urgentAlertsCount}
                            pinnedCount={pinnedCount}
                            onOpenFullNotepad={onOpenFullNotepad}
                            onOpenRepository={onOpenRepository}
                            onAddNote={onAddNote}
                            onOpenArchive={handleHubArchiveOpen}
                            forumUnreadCount={forumUnreadCount}
                        />
                    </Suspense>
                ) : (
                    <HomeDockStageFallback />
                )}
                </HomeDockChromeErrorBoundary>
                </div>
            ) : null}
        </div>
    );
}

export function LawyerDashboardHomeTab({
    visible,
    homeLayoutEditMode = false,
    onExitHomeLayoutEdit,
    ...rest
}: LawyerDashboardHomeTabProps) {
    const { patchHomeLayout } = useSettingsPatches();
    const { settings } = useLawyerSettings();

    const getZoneOrder = useCallback(
        (zone: HomeWidgetZone) =>
            filterDisplayHomeWidgets(getWidgetsInZone(settings.homeLayout.placements, zone), true),
        [settings.homeLayout.placements],
    );

    const onTransferWidget = useCallback(
        (widgetId: HomeWidgetId, zone: HomeWidgetZone, index: number) => {
            patchHomeLayout((layout) => {
                const fromZone = getWidgetZone(layout.placements, widgetId);
                const placements =
                    fromZone === zone
                        ? reorderWidgetInZone(layout.placements, widgetId, index)
                        : transferWidget(layout.placements, widgetId, zone, index);
                if (fromZone === zone) {
                    return { ...layout, placements };
                }
                return {
                    ...layout,
                    placements,
                    overrides: {
                        ...layout.overrides,
                        [widgetId]: adaptWidgetStyleForZoneChange(
                            widgetId,
                            layout.overrides[widgetId],
                            zone,
                        ),
                    },
                };
            });
        },
        [patchHomeLayout],
    );

    return (
        <div
            className="absolute inset-x-0 top-[84px] z-[1]"
            data-testid="lawyer-home-tab"
            aria-hidden={!visible}
        >
            <HomeLayoutEditProvider
                isEditing={homeLayoutEditMode}
                onExit={() => onExitHomeLayoutEdit?.()}
                onTransferWidget={onTransferWidget}
                getZoneOrder={getZoneOrder}
            >
                <HomeLayoutScrollRoot>
                    <LawyerHomeTabErrorBoundary>
                    <HomeTabContent visible={visible} homeLayoutEditMode={homeLayoutEditMode} {...rest} />
                    </LawyerHomeTabErrorBoundary>
                </HomeLayoutScrollRoot>
            </HomeLayoutEditProvider>
        </div>
    );
}
