import React, { Suspense, memo, useEffect, useMemo, useRef } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
    Scale,
    FileText,
    ArrowLeft,
    Bell,
    type LucideIcon,
} from '@/app/components/ui/lucideIcons';
import {
    HomeCalendarIcon,
    HomeListChecksIcon,
    HomeSmartRepositoryIcon,
} from '@/app/components/lawyer/dashboard/homeStemIcons';
import type { HomeStemIconProps } from '@/app/components/lawyer/dashboard/homeStemIcons';
import type { CommandCenterNote as Note } from './commandCenterTypes';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
} from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeWidgetId } from '@/app/services/settings/homeLayout';
import { getWidgetsInZone, filterDisplayHomeWidgets } from '@/app/services/settings/homeLayout';
import { dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import { resolveDockShellItemAriaLabel } from '@/app/services/settings/dockShellAria';
import { mergeBlockScopedAppearance, resolveCardThemePrimary } from '@/app/services/settings/themeResolve';
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
import { resolveBlockSizeScale } from '@/app/services/settings/homeBlockScale';
import type { CommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { useCommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { HAMI_SHELL_CONTAINER } from './dashboard/lawyerShellLayout';
import { useViewportShellScale } from '@/app/hooks/useViewportShellScale';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import {
    prefetchDockWidgetIntentDebounced,
    prefetchDockWidgetIntentImmediate,
    scheduleVisibleDockWidgetsPrefetch,
} from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import { dispatchFieldTasksPrimeHost } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksPrimeHost';
import { snapScheduleShellOpen } from '@/app/services/schedule/scheduleShellSnap';
import { paintRepositoryInstantChrome } from '@/app/runtime/repositoryInstantPaint';

/** Matches scheduleBootHydrator.ts — local to avoid sync stem pull. */
const SCHEDULE_PRIME_HOST_EVENT = 'hami:schedule-prime-host';

function dispatchSchedulePrimeHost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(SCHEDULE_PRIME_HOST_EVENT));
}
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

const LazyCommandCenterOverlays = lazyWithRetry(() =>
    import('./dashboard/CommandCenterOverlays').then((m) => ({
        default: m.CommandCenterOverlays as unknown as LazyComponent,
    })),
);

type DockShellIcon = LucideIcon | React.ComponentType<HomeStemIconProps>;

type DockItemProps = {
    widgetId: HomeWidgetId;
    icon: DockShellIcon;
    label: string;
    ariaLabel?: string;
    /** نص فقط — بدون صندوق أيقونة (مثل المنتدى) */
    hideIcon?: boolean;
    onClick: () => void;
    onPrefetch?: () => void;
    onPointerPrime?: () => void;
    /** فتح عند pointerdown — أسرع على اللمس من انتظار click */
    activateOnPointerDown?: boolean;
    active?: boolean;
    badge?: boolean;
    reduceMotion: boolean;
    disabled?: boolean;
    blockOverride?: HomeBlockStyleOverride;
    homeContainerBorder: boolean;
    showLabels: boolean;
    visualStyles: ReturnType<typeof resolveDockItemIconStyles>;
    hideIcon?: boolean;
};

const DockItem = memo(function DockItem({
    widgetId,
    icon: Icon,
    label,
    ariaLabel,
    onClick,
    onPrefetch,
    onPointerPrime,
    activateOnPointerDown = false,
    active,
    badge,
    reduceMotion,
    disabled = false,
    blockOverride,
    homeContainerBorder,
    showLabels,
    visualStyles,
    hideIcon = false,
}: DockItemProps) {
    const armedRef = useRef(false);
    const armClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerBorderOn = resolveBlockContainerBorder(blockOverride, homeContainerBorder);
    const pressMotionClass =
        reduceMotion || disabled ? '' : ' hami-dock-item-press';

    const clearArm = () => {
        armedRef.current = false;
        if (armClearTimerRef.current) {
            clearTimeout(armClearTimerRef.current);
            armClearTimerRef.current = null;
        }
    };

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
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                onPointerPrime?.();
                if (!activateOnPointerDown || disabled) return;
                armedRef.current = true;
                onClick();
                if (armClearTimerRef.current) clearTimeout(armClearTimerRef.current);
                armClearTimerRef.current = setTimeout(clearArm, 400);
            }}
            onPointerCancel={clearArm}
            onClick={() => {
                if (activateOnPointerDown && armedRef.current) {
                    clearArm();
                    return;
                }
                onClick();
            }}
            className={`hami-dock-item relative flex flex-col items-center justify-end gap-0 min-w-0 w-full pt-0.5 pb-1${pressMotionClass} ${DOCK_SHELL_ITEM_A11Y}`}
        >
            {hideIcon ? (
                <div
                    className="relative flex items-center justify-center w-full min-h-[48px] px-0.5 py-1"
                    aria-hidden
                >
                    <span
                        className="hami-dock-item-label font-semibold leading-tight tracking-wide text-center w-full"
                        style={visualStyles.labelStyle}
                    >
                        {label}
                    </span>
                </div>
            ) : (
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
            )}
            {showLabels && !hideIcon ? (
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
                false,
            ),
        [dockWidgets],
    );
    const visibleDockWidgets = useMemo(
        () => compactDockWidgets.filter((id) => isBlockVisible(overrides[id])),
        [compactDockWidgets, overrides],
    );

    const dockItemInteractions = useMemo(() => {
        const clicks: Partial<Record<HomeWidgetId, () => void>> = {};
        const prefetches: Partial<Record<HomeWidgetId, () => void>> = {};
        const pointerPrimes: Partial<Record<HomeWidgetId, () => void>> = {};

        for (const widgetId of visibleDockWidgets) {
            prefetches[widgetId] = () => prefetchDockWidgetIntentDebounced(widgetId);
            if (widgetId === 'dockTasks') {
                pointerPrimes[widgetId] = () => {
                    dispatchFieldTasksPrimeHost();
                    prefetchDockWidgetIntentImmediate('dockTasks', 'open');
                };
            }
            if (widgetId === 'dockCalendar') {
                pointerPrimes[widgetId] = () => {
                    snapScheduleShellOpen();
                    queueMicrotask(() => {
                        dispatchSchedulePrimeHost();
                        prefetchDockWidgetIntentImmediate('dockCalendar', 'hover');
                    });
                };
            }
            if (widgetId === 'dockRepository') {
                pointerPrimes[widgetId] = () => {
                    paintRepositoryInstantChrome();
                    prefetchDockWidgetIntentImmediate('dockRepository', 'hover');
                    void import('@/app/runtime/repositoryBootHydrator')
                        .then((m) => m.dispatchRepositoryPrimeHost())
                        .catch(() => undefined);
                };
            }
            const clickHandler = resolveDockWidgetClick(widgetId, false);
            if (clickHandler) clicks[widgetId] = clickHandler;
        }
        return { clicks, prefetches, pointerPrimes };
    }, [visibleDockWidgets, resolveDockWidgetClick]);

    const shellOverride = overrides.dockShell;
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
    const shellScopedAppearance = useMemo(
        () => mergeBlockScopedAppearance(appearance, shellOverride),
        [appearance, shellOverride],
    );
    const themePrimary = appearance.brandColor || '#E6C673';
    const homeContainerBorder = appearance.homeContainerBorder !== false;
    const shellContainerBorderOn = resolveBlockContainerBorder(shellOverride, homeContainerBorder);
    const shellStyle = resolveHomeBlockInlineStyle(shellOverride, themePrimary, {
        skipContentScale: true,
        defaultGlassOpacity: appearance.glassOpacity,
        appearance,
    });
    const showShell = shellVisible;

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
                    icon: DockShellIcon;
                    label: string;
                    active?: boolean;
                    badge?: boolean;
                    hideIcon?: boolean;
                }
            >
        > => ({
            alerts: {
                icon: Bell,
                label: dockShellLabel('alerts'),
                badge: urgentAlertsCount > 0 || pinnedCount > 0,
            },
            forum: {
                icon: FileText,
                label: dockShellLabel('forum'),
                hideIcon: true,
            },
            dockRepository: {
                icon: HomeSmartRepositoryIcon,
                label: dockShellLabel('dockRepository'),
            },
            dockNotepad: {
                icon: HomeSmartRepositoryIcon,
                label: dockShellLabel('dockRepository'),
            },
            dockCalendar: {
                icon: HomeCalendarIcon,
                label: dockShellLabel('dockCalendar'),
                badge: urgentAlertsCount > 0,
            },
            dockVault: {
                icon: HomeSmartRepositoryIcon,
                label: dockShellLabel('dockRepository'),
            },
            dockTasks: {
                icon: HomeListChecksIcon,
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
            const scoped = mergeBlockScopedAppearance(appearance, overrides[widgetId]);
            const accent = resolveHomeBlockAccent(
                overrides[widgetId],
                resolveCardThemePrimary(scoped),
            );
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
        if (!shellVisible || visibleDockWidgets.length === 0) return;
        return scheduleVisibleDockWidgetsPrefetch(visibleDockWidgets);
    }, [shellVisible, visibleDockWidgets]);

    const dockChromeStackGapPx = resolveDockChromeStackGapPx({ shellVisible: showShell });
    const dockChromeStackStyle = {
        '--hami-dock-chrome-stack-gap': `${dockChromeStackGapPx}px`,
        '--hami-dock-chrome-sticky-pad-top': '0px',
    } as React.CSSProperties;

    if (!showShell) {
        return null;
    }

    const dockShellRow = visibleDockWidgets.length > 0 ? (
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
                const dockAriaLabel = resolveDockShellItemAriaLabel(
                    widgetId,
                    cfg.label,
                    dockBadgeContext,
                );
                const clickHandler = dockItemInteractions.clicks[widgetId] ?? (() => undefined);
                return (
                    <DockItem
                        key={widgetId}
                        widgetId={widgetId}
                        icon={cfg.icon}
                        label={cfg.label}
                        ariaLabel={dockAriaLabel}
                        active={cfg.active}
                        badge={cfg.badge}
                        reduceMotion={reduceMotion}
                        disabled={false}
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
                        hideIcon={cfg.hideIcon}
                        onPrefetch={dockItemInteractions.prefetches[widgetId]}
                        onPointerPrime={dockItemInteractions.pointerPrimes[widgetId]}
                        activateOnPointerDown={
                            widgetId === 'dockCalendar' || widgetId === 'dockTasks'
                        }
                        onClick={clickHandler}
                    />
                );
            })}
        </div>
    ) : (
        <div
            data-hami-dock-icons=""
            className="hami-dock-shell-row relative flex min-h-[4.75rem] items-center justify-center px-3"
        >
            <p className="text-[10px] font-medium text-white/35 text-center leading-relaxed">
                الشريط السفلي فارغ — فعّله من الإعدادات
            </p>
        </div>
    );

    const dockShellInner = (
        <div
            data-testid="home-dock-shell-zone"
            className="hami-home-dock-shell-zone w-full"
        >
            <div
                data-hami-block="dockShell"
                data-hami-dock-count={visibleDockWidgets.length}
                data-hami-block-border={shellContainerBorderOn ? '1' : '0'}
                data-testid="home-dock-shell"
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
                {dockShellRow}
            </div>
        </div>
    );

    return (
        <>
            <div
                data-testid="home-dock-chrome-sticky"
                className="hami-home-dock-chrome-sticky sticky bottom-0 z-[55] w-full hami-shell-gutter-x pointer-events-none pb-[max(0px,env(safe-area-inset-bottom))]"
                style={dockChromeStackStyle}
            >
                <div
                    className={`${HAMI_SHELL_CONTAINER} pointer-events-auto flex flex-col hami-home-dock-chrome-stack w-full`}
                >
                    {showShell ? dockShellInner : null}
                </div>
            </div>

            {!externalDockActions ? (
                <Suspense fallback={null}>
                    <LazyCommandCenterOverlays userId={userId} actions={dockActions} />
                </Suspense>
            ) : null}
        </>
    );
});
