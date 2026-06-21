// @ts-nocheck
import React, { useCallback, useMemo } from 'react';
import {
    Book,
    Calendar as CalendarIcon,
    FolderOpen,
    ListChecks,
    MessageCircle,
    Scale,
    FileText,
} from 'lucide-react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey, ShapeKey } from '../LawyerShared';
import { LawyerHomeHubCard, LegalCommandCenterDock } from './lawyerHomeShell';
import { ExecutionHero, RouteTile } from './UnifiedCommandHub';
import { prefetchArchivePortal, prefetchExecutionDashboard, prefetchCommunityScreen } from '@/app/utils/lazyComponents';
import { formatForumUnreadBadge, shouldShowForumUnreadBadge } from '@/app/services/forum/forumShellNavigation';
import { classifySecretaryAlertsByHorizon } from '@/app/services/alertTimeClassification';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { CommandCenterNote } from '../commandCenterTypes';
import { LawyerHomeAmbient } from './LawyerHomeAmbient';
import { HOME_SCROLL } from './lawyerHomeTheme';
import { HAMI_SHELL_CONTAINER } from './lawyerShellLayout';
import './lawyerHomeFx.css';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import {
    getWidgetsInZone,
    transferWidget,
    reorderWidgetInZone,
    getWidgetZone,
    type HomeWidgetId,
    type HomeWidgetZone,
} from '@/app/services/settings/homeLayout';
import { HOME_WIDGET_LABELS } from '@/app/services/settings/homeBlockLabels';
import {
    isBlockVisible,
    isHeightProtectedWidget,
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
} from '@/app/services/settings/homeBlockScale';
import { HomeBlockShell } from './HomeBlockShell';
import { HomeLayoutEditProvider, useHomeLayoutEdit } from './homeLayoutEdit/HomeLayoutEditContext';
import { HomeLayoutEditChrome } from './homeLayoutEdit/HomeLayoutEditChrome';
import { DraggableHomeWidget } from './homeLayoutEdit/DraggableHomeWidget';
import { HomeDropZone } from './homeLayoutEdit/HomeDropZone';
import { HomeDropIndicator } from './homeLayoutEdit/HomeDropIndicator';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { useCommandCenterDockActions } from './useCommandCenterDockActions';
import { CommandCenterOverlays } from './CommandCenterOverlays';
import { HomeSovereignPromptBar } from './HomeSovereignPromptBar';
import { useForumUnreadCount } from '@/app/hooks/useForumUnreadCount';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';

export type LawyerDashboardHomeTabProps = {
    visible: boolean;
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
    onAddNote: (note: CommandCenterNote) => void;
};

function HomeTabContent({
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
    onAddNote,
}: Omit<LawyerDashboardHomeTabProps, 'visible' | 'onExitHomeLayoutEdit'>) {
    const reduceMotion = useReduceMotion();
    const { settings } = useLawyerSettings();
    const { patchBlockOverride } = useSettingsPatches();
    const { draggingWidgetId, dropHighlightZone } = useHomeLayoutEdit();
    const { placements, dockVisible, overrides } = settings.homeLayout;
    const themePrimary = theme.primary ?? '#E6C673';
    const accent = themePrimary;
    const secondaryAccent = theme.secondary ?? '#B8943F';
    const defaultGlassOpacity = settings.appearance.glassOpacity;

    const mainWidgets = useMemo(() => getWidgetsInZone(placements, 'main'), [placements]);
    const dockWidgets = useMemo(() => getWidgetsInZone(placements, 'dock'), [placements]);
    const forumUnreadCount = useForumUnreadCount(userId, !homeLayoutEditMode);
    useForumNotificationStream(userId, !homeLayoutEditMode);
    const pinnedCount = useWorkspaceStore((s) => s.pinnedItems.filter((p) => p.type !== 'hub').length);
    const unpinItem = useWorkspaceStore((s) => s.unpinItem);
    const urgentAlertsCount = useMemo(() => {
        const classified = classifySecretaryAlertsByHorizon(secretaryAlerts);
        return classified.urgentAlerts.length;
    }, [secretaryAlerts]);

    const dockAuthUserId = shellAuthUserId ?? userId;

    const dockActions = useCommandCenterDockActions({
        userId: dockAuthUserId,
        onOpenCalendar,
        onOpenFullNotepad,
        onOpenFieldTasksSheet,
        onOpenCommunity,
        onAddNote,
        onOpenArchive,
        onPrefetchExecution: () => {
            prefetchArchivePortal();
            prefetchExecutionDashboard();
        },
        secretaryAlerts,
        onNavigateRoute,
        onOpenEntity,
        onUnpinItem: unpinItem,
        pinnedCount,
        urgentAlertsCount,
    });

    const widgetVisible = (id: HomeWidgetId) =>
        homeLayoutEditMode || isBlockVisible(overrides[id]);

    const renderWidgetBody = (id: HomeWidgetId) => {
        const ov = overrides[id];
        switch (id) {
            case 'alerts':
                return (
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
                );
            case 'hubExecution':
                return (
                    <ExecutionHero
                        accent={accent}
                        onOpenArchive={() =>
                            dockActions.resolveDockWidgetClick('hubExecution', homeLayoutEditMode)?.()
                        }
                        onPrefetchExecution={() => {
                            prefetchArchivePortal();
                            prefetchExecutionDashboard();
                        }}
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={homeLayoutEditMode}
                    />
                );
            case 'hubLawsuit':
                return (
                    <RouteTile
                        card={{ id: 'lawsuit', tileId: 'hubLawsuit', label: 'دعاوى', icon: Scale, accent }}
                        onOpenArchive={() =>
                            dockActions.resolveDockWidgetClick('hubLawsuit', homeLayoutEditMode)?.()
                        }
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={homeLayoutEditMode}
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
                        onOpenArchive={() =>
                            dockActions.resolveDockWidgetClick('hubTransaction', homeLayoutEditMode)?.()
                        }
                        reduceMotion={reduceMotion}
                        blockOverride={ov}
                        themePrimary={themePrimary}
                        interactionDisabled={homeLayoutEditMode}
                    />
                );
            case 'forum': {
                const forumAccent = resolveHomeBlockAccent(ov, themePrimary);
                const forumSize = ov?.size ?? 'normal';
                const forumBox = forumIconBoxPx(forumSize);
                const forumIcon = forumIconStrokePx(forumSize);
                const forumLabel = forumLabelRem(forumSize);
                return (
                    <HomeBlockShell
                        blockId="forum"
                        override={ov}
                        themePrimary={themePrimary}
                        inheritContentScale
                        as="button"
                        type="button"
                        onClick={
                            homeLayoutEditMode
                                ? undefined
                                : () => dockActions.resolveDockWidgetClick('forum', false)?.()
                        }
                        onPointerDown={homeLayoutEditMode ? undefined : prefetchCommunityScreen}
                        onMouseEnter={homeLayoutEditMode ? undefined : prefetchCommunityScreen}
                        onFocus={homeLayoutEditMode ? undefined : prefetchCommunityScreen}
                        disabled={homeLayoutEditMode}
                        tabIndex={homeLayoutEditMode ? -1 : 0}
                        className={`group relative w-full px-4 py-3.5 flex items-center text-right ${
                            homeLayoutEditMode ? '' : 'active:opacity-[0.88] active:scale-[0.985] transition-all duration-300'
                        }`}
                    >
                        {shouldShowForumUnreadBadge(forumUnreadCount) && !homeLayoutEditMode ? (
                            <span className="absolute top-2.5 left-3 z-[2] min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg tabular-nums">
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
                            >
                                المنتدى القانوني
                            </p>
                        </div>
                    </HomeBlockShell>
                );
            }
            case 'dockNotepad':
            case 'dockCalendar':
            case 'dockVault':
            case 'dockTasks': {
                const icons = {
                    dockNotepad: Book,
                    dockCalendar: CalendarIcon,
                    dockVault: FolderOpen,
                    dockTasks: ListChecks,
                };
                const Icon = icons[id];
                const dockAccent = resolveHomeBlockAccent(ov, themePrimary);
                const dockSize = ov?.size ?? 'normal';
                const dockBox = dockCardIconBoxPx(dockSize);
                const dockIcon = dockIconStrokePx(dockSize);
                const dockLabel = dockCardLabelRem(dockSize);
                const onDockClick = dockActions.resolveDockWidgetClick(id, homeLayoutEditMode);
                const showTasksBadge = id === 'dockTasks' && pendingFieldTasksCount > 0;
                return (
                    <HomeBlockShell
                        blockId={id}
                        override={ov}
                        themePrimary={themePrimary}
                        inheritContentScale
                        as="button"
                        type="button"
                        onClick={onDockClick}
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
                                fontSize: `calc(${dockLabel}rem * var(--hami-content-scale, 1))`,
                            }}
                        >
                            {HOME_WIDGET_LABELS[id]}
                        </p>
                    </HomeBlockShell>
                );
            }
            case 'dockQuickNote': {
                const promptAccent = resolveHomeBlockAccent(ov, themePrimary);
                return (
                    <HomeSovereignPromptBar
                        value={dockActions.quickNote}
                        onChange={dockActions.setQuickNote}
                        onSubmit={() => dockActions.saveQuickNote(dockActions.quickNote)}
                        onVoiceClick={dockActions.openVoiceModal}
                        accent={promptAccent}
                        disabled={homeLayoutEditMode}
                        className="max-w-none px-0"
                    />
                );
            }
            default:
                return null;
        }
    };

    const showDock = homeLayoutEditMode || dockVisible || dockWidgets.length > 0;

    return (
        <>
            <LawyerHomeAmbient />
            {homeLayoutEditMode ? <HomeLayoutEditChrome /> : null}
            <HomeDropIndicator />
            <CommandCenterOverlays
                userId={dockAuthUserId}
                actions={dockActions}
                onNavigateRoute={onNavigateRoute}
            />
            <HomeDropZone
                zone="main"
                className={`${HOME_SCROLL} ${homeLayoutEditMode ? 'pt-14' : ''}`}
            >
                <div
                    className={`${HAMI_SHELL_CONTAINER} w-full ${showDock ? 'hami-home-dock-scroll-pad' : 'pb-14'}`}
                >
                    <div className="grid grid-cols-2 gap-3.5">
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
                        const heightProtected = isHeightProtectedWidget(widgetId);

                        return [
                            <div
                                key={widgetId}
                                className={span === 2 ? 'col-span-2' : undefined}
                                style={style}
                            >
                                <DraggableHomeWidget
                                    widgetId={widgetId}
                                    zone="main"
                                    label={HOME_WIDGET_LABELS[widgetId]}
                                    className={hidden && homeLayoutEditMode ? 'opacity-45' : ''}
                                    blockOverride={overrides[widgetId]}
                                    currentHeightPx={heightProtected ? undefined : overrides[widgetId]?.heightPx}
                                    currentSpan={span}
                                    onResizeHeight={
                                        heightProtected
                                            ? undefined
                                            : (heightPx) => patchBlockOverride(widgetId, { heightPx })
                                    }
                                    onResizeSpan={(nextSpan) => patchBlockOverride(widgetId, { span: nextSpan })}
                                >
                                    {renderWidgetBody(widgetId)}
                                </DraggableHomeWidget>
                            </div>,
                        ];
                    })}
                    </div>
                </div>
            </HomeDropZone>
            {homeLayoutEditMode && draggingWidgetId ? (
                <div className="fixed inset-x-0 bottom-[5.5rem] z-[45] hami-shell-gutter-x pointer-events-none pb-[max(0px,env(safe-area-inset-bottom))]">
                    <div className={HAMI_SHELL_CONTAINER}>
                        <div
                            className={`rounded-2xl border-2 border-dashed px-4 py-3 text-center transition-colors ${
                                dropHighlightZone === 'dock'
                                    ? 'border-[#E6C673]/70 bg-[#E6C673]/10'
                                    : 'border-white/15 bg-white/[0.02]'
                            }`}
                        >
                            <p className="text-[10px] font-bold text-white/50">أفلت هنا للشريط السفلي</p>
                        </div>
                    </div>
                </div>
            ) : null}
            {showDock ? (
                <LegalCommandCenterDock
                    userId={dockAuthUserId}
                    dockActions={dockActions}
                    onOpenCalendar={onOpenCalendar}
                    onOpenFieldTasksSheet={onOpenFieldTasksSheet}
                    pendingFieldTasksCount={pendingFieldTasksCount}
                    urgentAlertsCount={urgentAlertsCount}
                    pinnedCount={pinnedCount}
                    onOpenFullNotepad={onOpenFullNotepad}
                    onAddNote={onAddNote}
                    onOpenArchive={onOpenArchive}
                    onPrefetchExecution={() => {
                        prefetchArchivePortal();
                        prefetchExecutionDashboard();
                    }}
                />
            ) : null}
        </>
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
        (zone: HomeWidgetZone) => getWidgetsInZone(settings.homeLayout.placements, zone),
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

    if (!visible) return null;

    return (
        <div className="relative flex flex-col h-[100dvh] pt-[84px] pb-[100px] overflow-hidden">
            <HomeLayoutEditProvider
                isEditing={homeLayoutEditMode}
                onExit={() => onExitHomeLayoutEdit?.()}
                onTransferWidget={onTransferWidget}
                getZoneOrder={getZoneOrder}
            >
                <HomeTabContent homeLayoutEditMode={homeLayoutEditMode} {...rest} />
            </HomeLayoutEditProvider>
        </div>
    );
}
