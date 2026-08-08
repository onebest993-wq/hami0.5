import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeHubTileId } from '@/app/services/settings/homeLayout';
import { HOME_HUB_TILE_LABELS, dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import {
    resolveHomeBlockAccent,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    resolveHubTileMinHeight,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { resolveCardThemePrimary, mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { hubExecutionTitleRem } from '@/app/services/settings/homeBlockScale';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';
import { buildHubTileAriaLabel } from '@/app/components/lawyer/dashboard/commandHub/buildHubTileAriaLabel';
import { HubSparkAttentionBadge } from '@/app/components/lawyer/dashboard/commandHub/HubSparkAttentionBadge';
import { prefetchHubArchiveIntentDebounced } from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { dispatchTransactionsPrimeHost } from '@/app/runtime/transactionsBootHydrator';
import { dispatchExecutionArchivePrimeHost } from '@/app/runtime/executionArchivePrimeHost';
import { HomeBlockPatternOverlay } from '../HomeBlockPatternOverlay';
import { HomeMoroccanGlassDecor } from '../HomeMoroccanGlassDecor';
import {
    HomeArrowLeftIcon,
    type HomeStemIconProps,
} from '../homeStemIcons';
import {
    formatForumUnreadBadge,
    resolveForumShellAriaLabel,
    shouldShowForumUnreadBadge,
} from '@/app/services/forum/forumShellNavigation';
import { ForumMeridianBody } from './ForumTileVisuals';
import type { HomeWidgetId } from '@/app/services/settings/homeWidgetPlacements';
import {
    resolveDockShellItemAriaLabel,
    type DockShellBadgeContext,
} from '@/app/services/settings/dockShellAria';

type HubCard = {
    id: string;
    tileId: HomeHubTileId;
    label: string;
    icon: React.ComponentType<HomeStemIconProps>;
    accent: string;
};

const HUB_TILE_BUTTON_A11Y =
    'touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

function bindArchivePrefetch(archiveId: string, interactionDisabled: boolean) {
    if (interactionDisabled) {
        return { onPointerEnter: undefined, onPointerDown: undefined };
    }
    const run = () => {
        prefetchHubArchiveIntentDebounced(archiveId);
        if (archiveId === 'transaction') {
            dispatchTransactionsPrimeHost();
        }
        if (archiveId === 'execution') {
            dispatchExecutionArchivePrimeHost();
        }
    };
    return { onPointerEnter: run, onPointerDown: run };
}

function hubTilePressClass(
    variant: 'route' | 'hero',
    reduceMotion: boolean,
    interactionDisabled: boolean,
): string {
    if (reduceMotion || interactionDisabled) return '';
    return ` hami-hub-tile-press hami-hub-tile-press--${variant}`;
}

function tileShellClasses(
    override: HomeBlockStyleOverride | undefined,
    tileId: HomeHubTileId | 'forum',
    minH: string,
    globalShape: import('@/app/types/common').ShapeKey | undefined,
    containerBorderOn: boolean,
) {
    const borderCls = containerBorderOn ? 'border' : 'border-0';
    return `relative overflow-hidden ${borderCls} w-full text-right active:opacity-[0.88] transition-opacity duration-200 ${HUB_TILE_BUTTON_A11Y} ${resolveHomeBlockClassNames(override, globalShape)} ${minH}`;
}

type HubRouteVisuals = ReturnType<typeof resolveHubRouteTileVisuals>;

const HubIconBadge = memo(function HubIconBadge({
    icon: Icon,
    reduceMotion,
    visuals,
}: {
    icon: React.ComponentType<HomeStemIconProps>;
    reduceMotion: boolean;
    visuals: HubRouteVisuals;
}) {
    return (
        <div
            className={`relative shrink-0${reduceMotion ? '' : ' hami-hub-icon-badge-press'}`}
            style={visuals.iconWrapStyle}
        >
            <div
                className="absolute inset-0 rounded-[1.05rem] blur-md opacity-50 scale-110 pointer-events-none"
                style={visuals.iconGlowStyle}
                aria-hidden
            />
            <div
                className="absolute inset-0 rounded-[1.05rem] flex items-center justify-center overflow-hidden"
                style={visuals.iconBoxStyle}
            >
                <Icon strokeWidth={1.85} className="relative z-[1]" style={visuals.iconStyle} />
            </div>
        </div>
    );
});

const HubTileTitle = memo(function HubTileTitle({
    label,
    visuals,
    layoutSpan = 2,
}: {
    label: string;
    visuals: HubRouteVisuals;
    layoutSpan?: 1 | 2;
}) {
    const isHalf = layoutSpan === 1;
    const isLongHalfLabel = isHalf && label.trim().length > 9;

    return (
        <div className={`w-full min-w-0${isHalf ? ' text-center' : ' text-right space-y-2'}`}>
            <p
                dir="rtl"
                lang="ar"
                aria-hidden
                className={`hami-hub-title hami-hub-title-crystal tracking-[-0.025em]${
                    isHalf ? ' hami-hub-title--half-fill' : ' leading-[1.06] py-0.5'
                }${isLongHalfLabel ? ' hami-hub-title--half-compact' : ''}`}
                style={visuals.titleStyle}
            >
                {label}
            </p>
            {layoutSpan === 2 ? (
                <span
                    className="block rounded-full mr-0 ml-auto"
                    style={visuals.titleRuleStyle}
                    aria-hidden
                />
            ) : null}
        </div>
    );
});

export const RouteTile = memo(function RouteTile({
    card,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    themePrimary: _legacyThemePrimary,
    interactionDisabled = false,
    layoutSpan = 2,
    proceduralAttentionCount,
}: {
    card: HubCard;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
    /** عدّاد مسح سبارك — يُضاف إلى aria-label فقط */
    proceduralAttentionCount?: number;
}) {
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const accent = resolveHomeBlockAccent(blockOverride, cardThemePrimary);
    const tileSize = blockOverride?.size ?? 'normal';
    const baseH = 156;
    const minH =
        layoutSpan === 1
            ? 'min-h-[6.25rem]'
            : blockOverride?.heightPx
              ? ''
              : resolveHubTileMinHeight(card.tileId, tileSize);
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent, size: tileSize, layoutSpan }),
        [accent, tileSize, layoutSpan],
    );
    const halfTileBaseH = 100;
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: layoutSpan === 1 ? halfTileBaseH : baseH,
            skipHeightPx: layoutSpan === 1,
            skipContentScale: true,
            defaultGlassOpacity: globalAppearance.glassOpacity,
            appearance,
        }),
        ...(blockOverride?.heightPx && layoutSpan !== 1 ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const prefetchHandlers = bindArchivePrefetch(card.id, interactionDisabled);
    const handleOpen = useCallback(() => {
        onOpenArchive(card.id);
    }, [card.id, onOpenArchive]);
    const press = useScrollSafePress({
        disabled: interactionDisabled,
        onPress: handleOpen,
        onPointerDown: prefetchHandlers.onPointerDown,
    });

    return (
        <button
            type="button"
            data-hami-block={card.tileId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`hub-archive-${card.id}`}
            aria-label={buildHubTileAriaLabel(card.label, 'فتح الأرشيف', proceduralAttentionCount)}
            onPointerEnter={prefetchHandlers.onPointerEnter}
            onPointerDown={press.onPointerDown}
            onPointerMove={press.onPointerMove}
            onPointerUp={press.onPointerUp}
            onPointerCancel={press.onPointerCancel}
            onClick={press.onClick}
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={layoutSpan}
            className={`${tileShellClasses(blockOverride, card.tileId, minH, appearance.shape, containerBorderOn)} group${
                blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
            }${hubTilePressClass('route', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay blockId={card.tileId} override={blockOverride} themePrimary={cardThemePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} blockOverride={blockOverride} />
            <HubSparkAttentionBadge count={proceduralAttentionCount} />
            {layoutSpan === 2 ? (
                <div
                    className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-70"
                    style={tileVisuals.glowOrbStyle}
                    aria-hidden
                />
            ) : null}
            <div
                className={`relative z-10 flex h-full min-h-0 w-full ${
                    layoutSpan === 1
                        ? 'hami-hub-tile--half flex-row items-center justify-center px-2 py-1'
                        : 'flex-col items-end gap-3 p-4 sm:p-5'
                }`}
            >
                {layoutSpan === 2 ? (
                    <HubIconBadge icon={card.icon} reduceMotion={reduceMotion} visuals={tileVisuals} />
                ) : null}
                <div
                    className={
                        layoutSpan === 1
                            ? 'hami-hub-tile-body flex-1 h-full min-h-0 w-full pt-0'
                            : 'w-full min-w-0 mt-auto pt-0.5'
                    }
                >
                    <div
                        className={layoutSpan === 1 ? 'w-full min-w-0' : undefined}
                        data-hami-edit-hide-in-layout={interactionDisabled || undefined}
                    >
                        <HubTileTitle label={card.label} visuals={tileVisuals} layoutSpan={layoutSpan} />
                    </div>
                </div>
            </div>
        </button>
    );
});

export const ForumTile = memo(function ForumTile({
    forumUnreadCount,
    forumUnreadLoading: _forumUnreadLoading = false,
    onOpen,
    onPrefetch,
    reduceMotion,
    blockOverride,
    themePrimary: _legacyThemePrimary,
    interactionDisabled = false,
    layoutSpan = 2,
}: {
    forumUnreadCount: number;
    forumUnreadLoading?: boolean;
    onOpen: () => void;
    onPrefetch?: () => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
}) {
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const accent = resolveHomeBlockAccent(blockOverride, cardThemePrimary);
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: 128,
            skipHeightPx: true,
            skipContentScale: true,
            defaultGlassOpacity: globalAppearance.glassOpacity,
            appearance,
        }),
        ...(blockOverride?.heightPx ? { minHeight: blockOverride.heightPx } : {}),
        '--hami-forum-accent': accent,
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const forumLabel = dockShellLabel('forum');
    const unreadBadgeVisible = shouldShowForumUnreadBadge(forumUnreadCount) && !interactionDisabled;
    const prefetchHandlers =
        interactionDisabled || !onPrefetch
            ? { onPointerEnter: undefined, onPointerDown: undefined, onFocus: undefined }
            : {
                  onPointerEnter: onPrefetch,
                  onPointerDown: onPrefetch,
                  onFocus: onPrefetch,
              };

    return (
        <button
            type="button"
            data-hami-block="forum"
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid="home-dock-forum"
            aria-label={resolveForumShellAriaLabel(forumUnreadCount, {
                layoutEditMode: interactionDisabled,
            })}
            {...prefetchHandlers}
            onClick={interactionDisabled ? undefined : onOpen}
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={2}
            className={`relative overflow-hidden border w-full text-right active:opacity-[0.88] transition-opacity duration-200 ${HUB_TILE_BUTTON_A11Y} ${containerBorderOn ? 'border' : 'border-0'} min-h-[8rem] group ${resolveHomeBlockClassNames(blockOverride, appearance.shape)} hami-forum-meridian-shell${hubTilePressClass('route', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay blockId="forum" override={blockOverride} themePrimary={cardThemePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} blockOverride={blockOverride} />
            {unreadBadgeVisible ? (
                <span
                    className="absolute top-2.5 left-2.5 z-[4] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums shadow-lg ring-2 ring-[#060608]"
                    aria-hidden
                >
                    {formatForumUnreadBadge(forumUnreadCount)}
                </span>
            ) : null}
            <ForumMeridianBody title={forumLabel} accent={accent} />
        </button>
    );
});

export const DockHalfTile = memo(function DockHalfTile({
    widgetId,
    label,
    onOpen,
    prefetchHandlers,
    badgeContext,
    reduceMotion,
    blockOverride,
    themePrimary: _legacyThemePrimary,
    interactionDisabled = false,
    layoutSpan = 1,
    activateOnPointerDown = false,
}: {
    widgetId: HomeWidgetId;
    label: string;
    onOpen: () => void;
    prefetchHandlers?: {
        onPointerEnter?: () => void;
        onPointerDown?: () => void;
        onFocus?: () => void;
    };
    badgeContext?: DockShellBadgeContext;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
    activateOnPointerDown?: boolean;
}) {
    const armedRef = useRef(false);
    const armClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
    const TAP_MOVE_SLOP_PX = 12;
    const clearArm = useCallback(() => {
        armedRef.current = false;
        if (armClearTimerRef.current) {
            clearTimeout(armClearTimerRef.current);
            armClearTimerRef.current = null;
        }
    }, []);
    const handleOpen = useCallback(() => {
        onOpen();
    }, [onOpen]);
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const accent = resolveHomeBlockAccent(blockOverride, cardThemePrimary);
    const tileSize = blockOverride?.size ?? 'normal';
    const minH =
        layoutSpan === 1
            ? 'min-h-[6.25rem]'
            : blockOverride?.heightPx
              ? ''
              : 'min-h-[6.25rem]';
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent, size: tileSize, layoutSpan }),
        [accent, tileSize, layoutSpan],
    );
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: layoutSpan === 1 ? 100 : 156,
            skipHeightPx: layoutSpan === 1,
            skipContentScale: true,
            defaultGlassOpacity: globalAppearance.glassOpacity,
            appearance,
        }),
        ...(blockOverride?.heightPx && layoutSpan !== 1 ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const showTasksBadge =
        widgetId === 'dockTasks' && (badgeContext?.pendingFieldTasksCount ?? 0) > 0;
    const showRepositorySparkDot =
        widgetId === 'dockRepository' && (badgeContext?.repositorySparkAttentionCount ?? 0) > 0;
    const showCalendarSparkBadge =
        widgetId === 'dockCalendar' && (badgeContext?.calendarSparkAttentionCount ?? 0) > 0;
    const ariaLabel = resolveDockShellItemAriaLabel(widgetId, label, badgeContext);
    const pointerHandlers =
        interactionDisabled || !prefetchHandlers
            ? { onPointerEnter: undefined, onPointerDown: undefined, onFocus: undefined }
            : {
                  onPointerEnter: prefetchHandlers.onPointerEnter,
                  onFocus: prefetchHandlers.onFocus,
                  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
                      if (event.button != null && event.button !== 0) return;
                      if (event.pointerType === 'touch') {
                          pressOriginRef.current = { x: event.clientX, y: event.clientY };
                      } else {
                          pressOriginRef.current = null;
                      }
                      prefetchHandlers.onPointerDown?.();
                      if (!activateOnPointerDown || interactionDisabled) return;
                      armedRef.current = true;
                      handleOpen();
                      if (armClearTimerRef.current) clearTimeout(armClearTimerRef.current);
                      armClearTimerRef.current = setTimeout(clearArm, 400);
                  },
              };

    return (
        <button
            type="button"
            data-hami-block={widgetId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`home-dock-${widgetId}`}
            aria-label={ariaLabel}
            onPointerEnter={pointerHandlers.onPointerEnter}
            onFocus={pointerHandlers.onFocus}
            onPointerDown={pointerHandlers.onPointerDown}
            onPointerCancel={activateOnPointerDown ? clearArm : undefined}
            onClick={
                interactionDisabled
                    ? undefined
                    : (event) => {
                          const origin = pressOriginRef.current;
                          pressOriginRef.current = null;
                          if (origin) {
                              const dx = event.clientX - origin.x;
                              const dy = event.clientY - origin.y;
                              if (dx * dx + dy * dy > TAP_MOVE_SLOP_PX * TAP_MOVE_SLOP_PX) {
                                  return;
                              }
                          }
                          if (activateOnPointerDown && armedRef.current) {
                              clearArm();
                              return;
                          }
                          handleOpen();
                      }
            }
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={layoutSpan}
            className={`${tileShellClasses(
                blockOverride,
                widgetId as HomeHubTileId | 'forum',
                minH,
                appearance.shape,
                containerBorderOn,
            )} group${
                blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
            }${hubTilePressClass('route', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay blockId={widgetId} override={blockOverride} themePrimary={cardThemePrimary} />
            <HomeMoroccanGlassDecor
                blockId={widgetId}
                pattern={blockOverride?.pattern}
                blockOverride={blockOverride}
            />
            {showTasksBadge ? (
                <span
                    className="absolute top-2 left-2.5 z-[2] rounded-full backdrop-blur-md border border-white/20 bg-rose-400/35 ring-1 ring-white/10 shadow-[0_0_10px_rgba(244,63,94,0.35)]"
                    style={{
                        width: `calc(9px * var(--hami-content-scale, 1))`,
                        height: `calc(9px * var(--hami-content-scale, 1))`,
                    }}
                    aria-hidden
                />
            ) : null}
            {showRepositorySparkDot ? <HubSparkAttentionBadge count={1} variant="dot" /> : null}
            {showCalendarSparkBadge ? (
                <HubSparkAttentionBadge count={badgeContext?.calendarSparkAttentionCount} />
            ) : null}
            <div
                className={`relative z-10 flex h-full min-h-0 w-full ${
                    layoutSpan === 1
                        ? 'hami-hub-tile--half flex-row items-center justify-center px-2 py-1'
                        : 'flex-col items-end gap-3 p-4 sm:p-5'
                }`}
            >
                <div
                    className={
                        layoutSpan === 1
                            ? 'hami-hub-tile-body flex-1 h-full min-h-0 w-full pt-0'
                            : 'w-full min-w-0 mt-auto pt-0.5'
                    }
                >
                    <div
                        className={layoutSpan === 1 ? 'w-full min-w-0' : undefined}
                        data-hami-edit-hide-in-layout={interactionDisabled || undefined}
                    >
                        <HubTileTitle label={label} visuals={tileVisuals} layoutSpan={layoutSpan} />
                    </div>
                </div>
            </div>
        </button>
    );
});

export const ExecutionHero = memo(function ExecutionHero({
    accent,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    themePrimary: _legacyThemePrimary,
    interactionDisabled = false,
    layoutSpan = 2,
    proceduralAttentionCount,
}: {
    accent: string;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
    proceduralAttentionCount?: number;
}) {
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const resolvedAccent = resolveHomeBlockAccent(blockOverride, accent || cardThemePrimary);
    const execSize = blockOverride?.size ?? 'normal';
    const spanScale = layoutSpan === 1 ? 0.84 : 1;
    const titleRem = hubExecutionTitleRem(execSize) * spanScale;
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent: resolvedAccent, size: execSize, layoutSpan }),
        [resolvedAccent, execSize, layoutSpan],
    );
    const minH =
        layoutSpan === 1
            ? 'min-h-[6.25rem]'
            : blockOverride?.heightPx
              ? ''
              : resolveHubTileMinHeight('hubExecution', execSize);
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: layoutSpan === 1 ? 100 : 120,
            skipHeightPx: layoutSpan === 1,
            skipContentScale: true,
            defaultGlassOpacity: globalAppearance.glassOpacity,
            appearance,
        }),
        ...(blockOverride?.heightPx && layoutSpan !== 1 ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const prefetchHandlers = bindArchivePrefetch('execution', interactionDisabled);
    const handleOpen = useCallback(() => {
        onOpenArchive('execution');
    }, [onOpenArchive]);
    const executionLabel = HOME_HUB_TILE_LABELS.hubExecution;

    return (
        <button
            type="button"
            data-hami-block="hubExecution"
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid="hub-archive-execution"
            aria-label={buildHubTileAriaLabel(
                executionLabel,
                'فتح مخزن الإضابير التنفيذية',
                proceduralAttentionCount,
            )}
            {...prefetchHandlers}
            onClick={interactionDisabled ? undefined : handleOpen}
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={layoutSpan}
            className={`${tileShellClasses(blockOverride, 'hubExecution', minH, appearance.shape, containerBorderOn)} group${
                blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
            }${hubTilePressClass('hero', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay blockId="hubExecution" override={blockOverride} themePrimary={cardThemePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} blockOverride={blockOverride} />
            <HubSparkAttentionBadge count={proceduralAttentionCount} />
            {layoutSpan === 2 ? (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `
                        radial-gradient(ellipse 70% 90% at 100% 0%, ${resolvedAccent}16, transparent 55%),
                        radial-gradient(ellipse 50% 70% at 0% 100%, rgba(255,255,255,0.04), transparent 50%)
                    `,
                    }}
                    aria-hidden
                />
            ) : null}
            <div
                className={`relative z-10 h-full flex ${
                    layoutSpan === 1
                        ? 'hami-hub-tile--half flex-row items-center justify-center px-2 py-1'
                        : 'hami-hub-tile--hero'
                }`}
            >
                {layoutSpan === 1 ? (
                    <div className="hami-hub-tile-body flex-1 h-full min-h-0 w-full pt-0">
                        <div
                            className="w-full min-w-0"
                            data-hami-edit-hide-in-layout={interactionDisabled || undefined}
                        >
                            <HubTileTitle
                                label={executionLabel}
                                visuals={tileVisuals}
                                layoutSpan={layoutSpan}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="min-w-0 text-right flex-1 order-2">
                            <p
                                dir="rtl"
                                lang="ar"
                                aria-hidden
                                data-hami-edit-hide-in-layout={interactionDisabled || undefined}
                                className="hami-hub-title hami-hub-title-crystal hami-hub-title--hero leading-[1.08] tracking-[-0.025em] py-0.5"
                                style={{
                                    fontSize: `calc(${titleRem}rem * var(--hami-content-scale, 1))`,
                                    ['--hami-hub-title-accent' as string]: resolvedAccent,
                                }}
                            >
                                {executionLabel}
                            </p>
                        </div>
                        <div
                            className="shrink-0 order-1 rounded-2xl flex items-center justify-center hami-sovereign-float hami-hub-hero-icon"
                            style={{
                                width: `calc(2.75rem * var(--hami-content-scale, 1))`,
                                height: `calc(2.75rem * var(--hami-content-scale, 1))`,
                                background: `linear-gradient(160deg, ${resolvedAccent}28, rgba(0,0,0,0.5))`,
                                border: `1px solid ${resolvedAccent}35`,
                                boxShadow: `0 12px 40px ${resolvedAccent}18`,
                            }}
                        >
                            <HomeArrowLeftIcon
                                className="text-[#FFF8E7]/90 transition-transform duration-300 group-hover:-translate-x-1"
                                strokeWidth={1.75}
                                style={{
                                    width: `calc(1.2rem * var(--hami-content-scale, 1))`,
                                    height: `calc(1.2rem * var(--hami-content-scale, 1))`,
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </button>
    );
});
