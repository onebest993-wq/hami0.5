import React, { memo, useEffect, useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
    Book,
    ListChecks,
    FolderOpen,
    Calendar as CalendarIcon,
    Scale,
    FileText,
    ArrowLeft,
    Bell,
    MessageCircle,
    Warehouse,
    type LucideIcon,
} from 'lucide-react';
import type { CommandCenterNote as Note } from './commandCenterTypes';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
} from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeWidgetId } from '@/app/services/settings/homeLayout';
import { getWidgetsInZone, filterDisplayHomeWidgets } from '@/app/services/settings/homeLayout';
import { HOME_WIDGET_LABELS, dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import { resolveDockShellItemAriaLabel } from '@/app/services/settings/dockShellAria';
import {
    isBlockVisible,
    resolveHomeBlockAccent,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { HomeBlockPatternOverlay } from './dashboard/HomeBlockPatternOverlay';
import { resolveDockShellMetrics, scaleDockShellMetrics } from '@/app/services/settings/dockShellLayout';
import { resolveDockChromeStackGapPx } from '@/app/services/settings/homeDockChromeLayout';
import { resolveDockItemIconStyles } from '@/app/services/settings/resolveDockItemIconStyles';
import { EditableDockShell } from './dashboard/homeLayoutEdit/EditableDockShell';
import { DraggableHomeWidget } from './dashboard/homeLayoutEdit/DraggableHomeWidget';
import { resolveBlockSizeScale } from '@/app/services/settings/homeBlockScale';
import { HomeDropZone } from './dashboard/homeLayoutEdit/HomeDropZone';
import { useHomeLayoutEdit } from './dashboard/homeLayoutEdit/HomeLayoutEditContext';
import { useHomePageScroll } from './dashboard/homeLayoutEdit/HomeLayoutScrollRoot';
import type { CommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { useCommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { CommandCenterOverlays } from './dashboard/CommandCenterOverlays';
import { HAMI_SHELL_CONTAINER } from './dashboard/lawyerShellLayout';
import { useViewportShellScale } from '@/app/hooks/useViewportShellScale';
import {
    prefetchDockWidgetIntentDebounced,
    scheduleVisibleDockWidgetsPrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';

interface LegalCommandCenterDockProps {
    onAddNote?: (note: Note) => void;
    userId?: string;
    onOpenCalendar?: () => void;
    onOpenFullNotepad?: () => void;
    onOpenFieldTasksSheet?: () => void;
    pendingFieldTasksCount?: number;
    urgentAlertsCount?: number;
    pinnedCount?: number;
    forumUnreadCount?: number;
    onOpenArchive?: (id: string) => void;
    shellVisible?: boolean;
    dockActions?: CommandCenterDockActions;
}

const DOCK_SHELL_ITEM_A11Y =
    'touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

type DockItemProps = {
    widgetId: HomeWidgetId;
    icon: LucideIcon;
    label: string;
    ariaLabel?: string;
    onClick: () => void;
    onPrefetch?: () => void;
    active?: boolean;
    badge?: boolean;
    reduceMotion: boolean;
    disabled?: boolean;
    blockOverride?: HomeBlockStyleOverride;
    homeContainerBorder: boolean;
    showLabels: boolean;
    visualStyles: ReturnType<typeof resolveDockItemIconStyles>;
};

const DockItem = memo(function DockItem({
    widgetId,
    icon: Icon,
    label,
    ariaLabel,
    onClick,
    onPrefetch,
    active,
    badge,
    reduceMotion,
    disabled = false,
    blockOverride,
    homeContainerBorder,
    showLabels,
    visualStyles,
}: DockItemProps) {
    const containerBorderOn = resolveBlockContainerBorder(blockOverride, homeContainerBorder);
    const pressMotionClass =
        reduceMotion || disabled ? '' : ' hami-dock-item-press';

    return (
        <button
            type="button"
            data-hami-block={widgetId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`home-dock-shell-${widgetId}`}
            aria-label={ariaLabel ?? label}
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onPointerEnter={onPrefetch}
            onClick={onClick}
            className={`hami-dock-item relative flex flex-col items-center justify-end gap-0 min-w-0 w-full pt-0.5 pb-1${pressMotionClass} ${DOCK_SHELL_ITEM_A11Y}`}
        >
            <div className="relative flex flex-col items-center w-full" aria-hidden>
                <div
                    className="relative flex items-center justify-center shrink-0"
                    style={visualStyles.boxStyle}
                >
                    <Icon
                        strokeWidth={active ? 2.1 : 1.75}
                        className="relative z-[1]"
                        style={visualStyles.iconStyle}
                    />
                    {badge ? (
                        <span
                            className="absolute -top-0.5 -right-0.5 rounded-full bg-rose-500 ring-2 ring-[#060608]"
                            style={{ width: 8, height: 8 }}
                            aria-hidden
                        />
                    ) : null}
                </div>
                {active ? (
                    <span
                        className="mt-1 rounded-full shrink-0"
                        style={{ width: '1rem', height: 2, background: visualStyles.accent }}
                        aria-hidden
                    />
                ) : (
                    <span className="mt-1 shrink-0" style={{ height: 2 }} aria-hidden />
                )}
            </div>
            {showLabels ? (
                <span
                    className="hami-dock-item-label font-semibold leading-tight tracking-wide truncate w-full text-center px-0.5 mt-1 mb-0.5"
                    style={visualStyles.labelStyle}
                    aria-hidden
                >
                    {label}
                </span>
            ) : null}
        </button>
    );
});

export const LegalCommandCenterDock = memo(function LegalCommandCenterDock({
    onAddNote,
    userId,
    onOpenCalendar,
    onOpenFullNotepad,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount = 0,
    urgentAlertsCount = 0,
    pinnedCount = 0,
    forumUnreadCount = 0,
    onOpenArchive,
    shellVisible = true,
    dockActions: externalDockActions,
}: LegalCommandCenterDockProps) {
    const reduceMotion = useReduceMotion();
    const viewportShellScale = useViewportShellScale();
    const appearance = useLawyerSettingsAppearance();
    const { placements, overrides } = useLawyerSettingsHomeLayout();
    const { isEditing } = useHomeLayoutEdit();
    const { dockSticky } = useHomePageScroll();

    const internalDockActions = useCommandCenterDockActions({
        userId,
        onOpenCalendar,
        onOpenFullNotepad,
        onOpenFieldTasksSheet,
        onAddNote,
        onOpenArchive,
    });
    const dockActions = externalDockActions ?? internalDockActions;
    const { resolveDockWidgetClick } = dockActions;

    const dockWidgets = useMemo(() => getWidgetsInZone(placements, 'dock'), [placements]);
    const compactDockWidgets = useMemo(
        () =>
            filterDisplayHomeWidgets(
                dockWidgets.filter((id) => id !== 'dockQuickNote'),
                isEditing,
            ),
        [dockWidgets, isEditing],
    );
    const visibleDockWidgets = useMemo(
        () => compactDockWidgets.filter((id) => isEditing || isBlockVisible(overrides[id])),
        [compactDockWidgets, isEditing, overrides],
    );

    const dockItemInteractions = useMemo(() => {
        const clicks: Partial<Record<HomeWidgetId, () => void>> = {};
        const prefetches: Partial<Record<HomeWidgetId, () => void>> = {};
        if (isEditing) return { clicks, prefetches };

        for (const widgetId of visibleDockWidgets) {
            prefetches[widgetId] = () => prefetchDockWidgetIntentDebounced(widgetId);
            const clickHandler = resolveDockWidgetClick(widgetId, false);
            if (clickHandler) clicks[widgetId] = clickHandler;
        }
        return { clicks, prefetches };
    }, [visibleDockWidgets, isEditing, resolveDockWidgetClick]);

    const shellOverride = overrides.dockShell;
    const dockLiftPx = shellOverride?.dockLiftPx ?? 0;
    const shellIconCount = Math.max(1, visibleDockWidgets.length);
    const shellMetrics = useMemo(
        () =>
            scaleDockShellMetrics(
                scaleDockShellMetrics(
                    resolveDockShellMetrics(shellIconCount),
                    viewportShellScale,
                ),
                resolveBlockSizeScale(shellOverride?.size),
            ),
        [shellIconCount, viewportShellScale, shellOverride?.size],
    );
    const shellClasses = resolveHomeBlockClassNames(shellOverride);
    const themePrimary = appearance.brandColor || '#E6C673';
    const homeContainerBorder = appearance.homeContainerBorder !== false;
    const shellContainerBorderOn = resolveBlockContainerBorder(shellOverride, homeContainerBorder);
    const shellStyle = resolveHomeBlockInlineStyle(shellOverride, themePrimary, {
        skipContentScale: true,
        defaultGlassOpacity: appearance.glassOpacity,
    });
    const showShell = shellVisible || isEditing;

    const dockBadgeContext = useMemo(
        () => ({
            pendingFieldTasksCount,
            urgentAlertsCount,
            pinnedCount,
            forumUnreadCount,
        }),
        [pendingFieldTasksCount, urgentAlertsCount, pinnedCount, forumUnreadCount],
    );

    const widgetConfigs = useMemo(
        (): Partial<
            Record<
                HomeWidgetId,
                {
                    icon: LucideIcon;
                    label: string;
                    active?: boolean;
                    badge?: boolean;
                }
            >
        > => ({
            alerts: {
                icon: Bell,
                label: dockShellLabel('alerts'),
                badge: urgentAlertsCount > 0 || pinnedCount > 0,
            },
            forum: {
                icon: MessageCircle,
                label: dockShellLabel('forum'),
            },
            dockRepository: {
                icon: Warehouse,
                label: dockShellLabel('dockRepository'),
            },
            dockNotepad: {
                icon: Book,
                label: dockShellLabel('dockNotepad'),
            },
            dockCalendar: {
                icon: CalendarIcon,
                label: dockShellLabel('dockCalendar'),
                badge: urgentAlertsCount > 0,
            },
            dockVault: {
                icon: FolderOpen,
                label: dockShellLabel('dockVault'),
            },
            dockTasks: {
                icon: ListChecks,
                label: dockShellLabel('dockTasks'),
                badge: pendingFieldTasksCount > 0,
            },
            hubExecution: {
                icon: ArrowLeft,
                label: dockShellLabel('hubExecution'),
            },
            hubLawsuit: {
                icon: Scale,
                label: dockShellLabel('hubLawsuit'),
            },
            hubTransaction: {
                icon: FileText,
                label: dockShellLabel('hubTransaction'),
            },
        }),
        [pendingFieldTasksCount, urgentAlertsCount, pinnedCount],
    );

    const dockItemVisuals = useMemo(() => {
        const map: Partial<Record<HomeWidgetId, ReturnType<typeof resolveDockItemIconStyles>>> = {};
        for (const widgetId of visibleDockWidgets) {
            const cfg = widgetConfigs[widgetId];
            const accent = resolveHomeBlockAccent(overrides[widgetId], themePrimary);
            map[widgetId] = resolveDockItemIconStyles({
                accent,
                active: cfg?.active,
                buttonBoxPx: shellMetrics.buttonBoxPx,
                iconRadiusRem: shellMetrics.iconRadiusRem,
                iconStrokePx: shellMetrics.iconStrokePx,
                labelPx: shellMetrics.labelPx,
            });
        }
        return map;
    }, [visibleDockWidgets, widgetConfigs, overrides, themePrimary, shellMetrics]);

    useEffect(() => {
        if (!shellVisible || isEditing || visibleDockWidgets.length === 0) return;
        return scheduleVisibleDockWidgetsPrefetch(visibleDockWidgets);
    }, [shellVisible, isEditing, visibleDockWidgets]);

    const dockChromeStackGapPx = resolveDockChromeStackGapPx({ shellVisible: showShell });
    const dockChromeStackStyle = {
        '--hami-dock-chrome-stack-gap': `${dockChromeStackGapPx}px`,
        '--hami-dock-chrome-sticky-pad-top': '0px',
    } as React.CSSProperties;

    if (!showShell && !isEditing) {
        return null;
    }

    return (
        <>
            <div
                data-testid="home-dock-chrome-sticky"
                className={`hami-home-dock-chrome-sticky ${dockSticky ? 'sticky bottom-0' : 'relative'} z-[55] w-full hami-shell-gutter-x pointer-events-none pb-[max(0px,env(safe-area-inset-bottom))] ${isEditing ? 'z-[80]' : ''}`}
                style={dockChromeStackStyle}
            >
                <div
                    data-testid="home-dock-chrome"
                    className={`${HAMI_SHELL_CONTAINER} pointer-events-auto flex flex-col hami-home-dock-chrome-stack`}
                >
                    {showShell ? (
                        <div
                            data-testid="home-dock-shell-zone"
                            className="hami-home-dock-shell-zone w-full"
                            style={dockLiftPx ? { transform: `translateY(-${dockLiftPx}px)` } : undefined}
                        >
                            <HomeDropZone zone="dock" className={`w-full ${isEditing ? 'flex flex-col gap-4' : ''}`}>
                                <EditableDockShell
                                    dockCount={visibleDockWidgets.length}
                                    containerBorderOn={shellContainerBorderOn}
                                    className={`relative border ${shellClasses} ${shellMetrics.shellPaddingClass}`}
                                    style={shellStyle}
                                >
                                    <HomeBlockPatternOverlay override={shellOverride} themePrimary={themePrimary} />
                                    {shouldShowHomeBlockSheen(shellOverride?.pattern) ? (
                                        <div
                                            className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none"
                                            aria-hidden
                                        />
                                    ) : null}
                                    {visibleDockWidgets.length > 0 ? (
                                        <div
                                            data-hami-dock-icons=""
                                            className="hami-dock-shell-row relative grid items-end w-full"
                                            style={{
                                                gridTemplateColumns: `repeat(${visibleDockWidgets.length}, minmax(0, 1fr))`,
                                                gap: `${shellMetrics.gapRem}rem`,
                                                minHeight: shellMetrics.rowMinHeightPx,
                                            }}
                                        >
                                            {visibleDockWidgets.map((widgetId) => {
                                                const cfg = widgetConfigs[widgetId] ?? {
                                                    icon: FileText,
                                                    label: dockShellLabel(widgetId),
                                                };
                                                const hidden = !isBlockVisible(overrides[widgetId]);
                                                const dockAriaLabel = resolveDockShellItemAriaLabel(
                                                    widgetId,
                                                    cfg.label,
                                                    dockBadgeContext,
                                                );
                                                const clickHandler =
                                                    dockItemInteractions.clicks[widgetId] ?? (() => undefined);
                                                const item = (
                                                    <DockItem
                                                        widgetId={widgetId}
                                                        icon={cfg.icon}
                                                        label={cfg.label}
                                                        ariaLabel={dockAriaLabel}
                                                        active={cfg.active}
                                                        badge={cfg.badge}
                                                        reduceMotion={reduceMotion}
                                                        disabled={isEditing}
                                                        blockOverride={overrides[widgetId]}
                                                        homeContainerBorder={homeContainerBorder}
                                                        showLabels={shellMetrics.showLabels}
                                                        visualStyles={
                                                            dockItemVisuals[widgetId] ??
                                                            resolveDockItemIconStyles({
                                                                accent: themePrimary,
                                                                buttonBoxPx: shellMetrics.buttonBoxPx,
                                                                iconRadiusRem: shellMetrics.iconRadiusRem,
                                                                iconStrokePx: shellMetrics.iconStrokePx,
                                                                labelPx: shellMetrics.labelPx,
                                                            })
                                                        }
                                                        onPrefetch={dockItemInteractions.prefetches[widgetId]}
                                                        onClick={clickHandler}
                                                    />
                                                );
                                                if (isEditing) {
                                                    return (
                                                        <DraggableHomeWidget
                                                            key={widgetId}
                                                            widgetId={widgetId}
                                                            zone="dock"
                                                            label={HOME_WIDGET_LABELS[widgetId]}
                                                            className={`min-w-0 ${hidden ? 'opacity-45' : ''}`}
                                                            blockOverride={overrides[widgetId]}
                                                        >
                                                            {item}
                                                        </DraggableHomeWidget>
                                                    );
                                                }
                                                return <React.Fragment key={widgetId}>{item}</React.Fragment>;
                                            })}
                                        </div>
                                    ) : (
                                        <div
                                            data-hami-dock-icons=""
                                            className="hami-dock-shell-row relative flex min-h-[4.75rem] items-center justify-center px-3"
                                        >
                                            <p className="text-[10px] font-medium text-white/35 text-center leading-relaxed">
                                                {isEditing
                                                    ? 'اسحب أقساماً هنا للشريط السفلي'
                                                    : 'الشريط السفلي فارغ — فعّله من الإعدادات أو انقل أقساماً إليه'}
                                            </p>
                                        </div>
                                    )}
                                </EditableDockShell>
                            </HomeDropZone>
                        </div>
                    ) : null}
                </div>
            </div>

            {!externalDockActions ? (
                <CommandCenterOverlays userId={userId} actions={dockActions} />
            ) : null}
        </>
    );
});
