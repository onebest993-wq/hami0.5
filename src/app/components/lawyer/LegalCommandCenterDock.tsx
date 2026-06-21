import React, { useMemo } from 'react';
import { motion } from 'motion/react';
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
    type LucideIcon,
} from 'lucide-react';
import type { CommandCenterNote as Note } from './commandCenterTypes';
import { HomeSovereignPromptBar } from './dashboard/HomeSovereignPromptBar';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeWidgetId } from '@/app/services/settings/homeLayout';
import { getWidgetsInZone } from '@/app/services/settings/homeLayout';
import { HOME_WIDGET_LABELS, dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import {
    isBlockVisible,
    resolveHomeBlockAccent,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { HomeBlockPatternOverlay } from './dashboard/HomeBlockPatternOverlay';
import { resolveDockShellMetrics, scaleDockShellMetrics, type DockShellMetrics } from '@/app/services/settings/dockShellLayout';
import { EditableDockShell } from './dashboard/homeLayoutEdit/EditableDockShell';
import { DraggableHomeWidget } from './dashboard/homeLayoutEdit/DraggableHomeWidget';
import { resolveBlockSizeScale } from '@/app/services/settings/homeBlockScale';
import { HomeDropZone } from './dashboard/homeLayoutEdit/HomeDropZone';
import { useHomeLayoutEdit } from './dashboard/homeLayoutEdit/HomeLayoutEditContext';
import type { CommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { useCommandCenterDockActions } from './dashboard/useCommandCenterDockActions';
import { CommandCenterOverlays } from './dashboard/CommandCenterOverlays';
import { HAMI_SHELL_CONTAINER } from './dashboard/lawyerShellLayout';
import { useViewportShellScale } from '@/app/hooks/useViewportShellScale';

interface LegalCommandCenterDockProps {
    onAddNote?: (note: Note) => void;
    userId?: string;
    onOpenCalendar?: () => void;
    onOpenFullNotepad?: () => void;
    onOpenFieldTasksSheet?: () => void;
    pendingFieldTasksCount?: number;
    urgentAlertsCount?: number;
    pinnedCount?: number;
    onOpenArchive?: (id: string) => void;
    onPrefetchExecution?: () => void;
    /** حالة مشتركة مع LawyerDashboardHomeTab عند نقل عناصر الدوك */
    dockActions?: CommandCenterDockActions;
}

type DockItemProps = {
    widgetId: HomeWidgetId;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    active?: boolean;
    badge?: boolean;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    shellMetrics: DockShellMetrics;
};

function DockItem({
    widgetId,
    icon: Icon,
    label,
    onClick,
    active,
    badge,
    reduceMotion,
    blockOverride,
    themePrimary,
    shellMetrics,
}: DockItemProps) {
    const { settings } = useLawyerSettings();
    const accent = resolveHomeBlockAccent(blockOverride, themePrimary);
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        settings.appearance.homeContainerBorder !== false,
    );
    const { buttonBoxPx, iconStrokePx, labelPx, showLabels, iconRadiusRem } = shellMetrics;

    return (
        <motion.button
            type="button"
            data-hami-block={widgetId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            onClick={onClick}
            title={label}
            whileHover={reduceMotion ? undefined : { scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="hami-dock-item relative flex flex-col items-center justify-end gap-0 min-w-0 w-full pt-0.5 pb-1"
        >
            <div className="relative flex flex-col items-center w-full">
                <motion.div
                    className="relative flex items-center justify-center shrink-0"
                    style={{
                        width: buttonBoxPx,
                        height: buttonBoxPx,
                        borderRadius: `${iconRadiusRem}rem`,
                        background: active
                            ? `color-mix(in srgb, ${accent} 14%, rgba(255,255,255,0.05))`
                            : `color-mix(in srgb, ${accent} 6%, rgba(255,255,255,0.04))`,
                        border: active
                            ? `1px solid color-mix(in srgb, ${accent} 35%, transparent)`
                            : `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.09))`,
                        boxShadow: active
                            ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px color-mix(in srgb, ${accent} 14%, transparent)`
                            : 'inset 0 1px 0 rgba(255,255,255,0.07)',
                    }}
                >
                    <Icon
                        strokeWidth={active ? 2.1 : 1.75}
                        className="relative z-[1]"
                        style={{
                            width: iconStrokePx + 2,
                            height: iconStrokePx + 2,
                            color: active ? accent : 'rgba(255,255,255,0.85)',
                            filter: active ? `drop-shadow(0 0 10px color-mix(in srgb, ${accent} 35%, transparent))` : undefined,
                        }}
                    />
                    {badge ? (
                        <span
                            className="absolute -top-0.5 -right-0.5 rounded-full bg-rose-500 ring-2 ring-[#060608]"
                            style={{ width: 8, height: 8 }}
                            aria-hidden
                        />
                    ) : null}
                </motion.div>
                {active ? (
                    <span
                        className="mt-1 rounded-full shrink-0"
                        style={{ width: '1rem', height: 2, background: accent }}
                        aria-hidden
                    />
                ) : (
                    <span className="mt-1 shrink-0" style={{ height: 2 }} aria-hidden />
                )}
            </div>
            {showLabels ? (
                <span
                    className="hami-dock-item-label font-semibold leading-tight tracking-wide truncate w-full text-center px-0.5 mt-1 mb-0.5"
                    style={{
                        fontSize: labelPx,
                        color: active ? accent : 'rgba(255,255,255,0.55)',
                    }}
                >
                    {label}
                </span>
            ) : null}
        </motion.button>
    );
}

export const LegalCommandCenterDock: React.FC<LegalCommandCenterDockProps> = ({
    onAddNote,
    userId,
    onOpenCalendar,
    onOpenFullNotepad,
    onOpenFieldTasksSheet,
    pendingFieldTasksCount = 0,
    urgentAlertsCount = 0,
    pinnedCount = 0,
    onOpenArchive,
    onPrefetchExecution,
    dockActions: externalDockActions,
}) => {
    const reduceMotion = useReduceMotion();
    const viewportShellScale = useViewportShellScale();
    const { settings } = useLawyerSettings();
    const { isEditing } = useHomeLayoutEdit();
    const { placements, overrides } = settings.homeLayout;
    const dockWidgets = useMemo(() => getWidgetsInZone(placements, 'dock'), [placements]);

    const widgetVisible = (widgetId: HomeWidgetId) =>
        isEditing || isBlockVisible(overrides[widgetId]);

    const compactDockWidgets = useMemo(
        () => dockWidgets.filter((id) => id !== 'dockQuickNote'),
        [dockWidgets],
    );
    const visibleDockWidgets = useMemo(
        () => compactDockWidgets.filter((id) => isEditing || isBlockVisible(overrides[id])),
        [compactDockWidgets, isEditing, overrides],
    );
    const shellOverride = overrides.dockShell;
    const dockLiftPx = shellOverride?.dockLiftPx ?? 0;
    const shellMetrics = useMemo(
        () =>
            scaleDockShellMetrics(
                scaleDockShellMetrics(
                    resolveDockShellMetrics(visibleDockWidgets.length),
                    viewportShellScale,
                ),
                resolveBlockSizeScale(shellOverride?.size),
            ),
        [visibleDockWidgets.length, viewportShellScale, shellOverride?.size],
    );
    const shellClasses = resolveHomeBlockClassNames(shellOverride);
    const themePrimary = settings.appearance.brandColor || '#E6C673';
    const shellContainerBorderOn = resolveBlockContainerBorder(
        shellOverride,
        settings.appearance.homeContainerBorder !== false,
    );
    const shellStyle = resolveHomeBlockInlineStyle(shellOverride, themePrimary, {
        skipContentScale: true,
        defaultGlassOpacity: settings.appearance.glassOpacity,
    });
    const promptInDock = dockWidgets.includes('dockQuickNote') && widgetVisible('dockQuickNote');

    const internalDockActions = useCommandCenterDockActions({
        userId,
        onOpenCalendar,
        onOpenFullNotepad,
        onOpenFieldTasksSheet,
        onAddNote,
        onOpenArchive,
        onPrefetchExecution,
    });
    const dockActions = externalDockActions ?? internalDockActions;
    const { saveQuickNote, quickNote, setQuickNote, resolveDockWidgetClick } = dockActions;
    const promptAccent = resolveHomeBlockAccent(overrides.dockQuickNote, themePrimary);

    const widgetConfigs: Partial<
        Record<
            HomeWidgetId,
            {
                icon: LucideIcon;
                label: string;
                active?: boolean;
                badge?: boolean;
            }
        >
    > = {
        alerts: {
            icon: Bell,
            label: dockShellLabel('alerts'),
            badge: urgentAlertsCount > 0 || pinnedCount > 0,
        },
        forum: {
            icon: MessageCircle,
            label: dockShellLabel('forum'),
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
    };

    return (
        <>
            <motion.div
                className={`fixed inset-x-0 hami-shell-gutter-x pointer-events-none pb-[max(0px,env(safe-area-inset-bottom))] ${isEditing ? 'z-[92]' : 'z-[55]'}`}
                style={{ bottom: `calc(6.25rem + ${dockLiftPx}px)` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.22 }}
            >
                <div className={`${HAMI_SHELL_CONTAINER} pointer-events-auto`}>
                    <HomeDropZone zone="dock" className="w-full">
                        {promptInDock ? (
                            <div className="mb-3">
                                {isEditing ? (
                                    <DraggableHomeWidget
                                        widgetId="dockQuickNote"
                                        zone="dock"
                                        label={HOME_WIDGET_LABELS.dockQuickNote}
                                        className="w-full"
                                        blockOverride={overrides.dockQuickNote}
                                    >
                                        <HomeSovereignPromptBar
                                            value={quickNote}
                                            onChange={setQuickNote}
                                            onSubmit={() => saveQuickNote(quickNote)}
                                            onVoiceClick={dockActions.openVoiceModal}
                                            accent={promptAccent}
                                            disabled
                                        />
                                    </DraggableHomeWidget>
                                ) : (
                                    <HomeSovereignPromptBar
                                        value={quickNote}
                                        onChange={setQuickNote}
                                        onSubmit={() => saveQuickNote(quickNote)}
                                        onVoiceClick={dockActions.openVoiceModal}
                                        accent={promptAccent}
                                    />
                                )}
                            </div>
                        ) : null}

                        {visibleDockWidgets.length > 0 ? (
                        <EditableDockShell
                            dockCount={visibleDockWidgets.length}
                            containerBorderOn={shellContainerBorderOn}
                            className={`relative border ${shellClasses} ${shellMetrics.shellPaddingClass}`}
                            style={shellStyle}
                        >
                            <HomeBlockPatternOverlay override={shellOverride} themePrimary={themePrimary} />
                            {shouldShowHomeBlockSheen(shellOverride?.pattern) ? (
                                <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />
                            ) : null}
                            <div
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
                                    return (
                                        <DraggableHomeWidget
                                            key={widgetId}
                                            widgetId={widgetId}
                                            zone="dock"
                                            label={HOME_WIDGET_LABELS[widgetId]}
                                            className={`min-w-0 ${hidden && isEditing ? 'opacity-45' : ''}`}
                                            blockOverride={overrides[widgetId]}
                                        >
                                            <DockItem
                                                widgetId={widgetId}
                                                icon={cfg.icon}
                                                label={cfg.label}
                                                active={cfg.active}
                                                badge={cfg.badge}
                                                reduceMotion={reduceMotion}
                                                blockOverride={overrides[widgetId]}
                                                themePrimary={themePrimary}
                                                shellMetrics={shellMetrics}
                                                onClick={() => resolveDockWidgetClick(widgetId, isEditing)?.()}
                                            />
                                        </DraggableHomeWidget>
                                    );
                                })}
                            </div>
                        </EditableDockShell>
                        ) : null}
                    </HomeDropZone>
                </div>
            </motion.div>

            {!externalDockActions ? (
                <CommandCenterOverlays userId={userId} actions={dockActions} />
            ) : null}
        </>
    );
};
