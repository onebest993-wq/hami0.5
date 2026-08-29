import React, { memo, useCallback, useMemo } from 'react';
import { useLawyerSettingsAppearance } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import type { HomeBlockStyleOverride, HomeHubTileId } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockAccent,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { resolveCardThemePrimary, mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';
import type { HomeWidgetId } from '@/app/services/settings/homeWidgetPlacements';
import {
    resolveDockShellItemAriaLabel,
    type DockShellBadgeContext,
} from '@/app/services/settings/dockShellAria';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { hubTilePressClass, tileShellClasses } from './commandHubTileClasses';
import { HUB_HALF_TILE_BASE_PX, HUB_HALF_TILE_MIN_CLASS } from '@/app/components/lawyer/dashboard/hubHalfTileMetrics';
import { HubTileFace } from './commandHubTileChrome';
import { HomeBlockPatternOverlay } from '../HomeBlockPatternOverlay';

export const DockHalfTile = memo(function DockHalfTile({
    widgetId,
    label,
    onOpen,
    prefetchHandlers,
    badgeContext,
    reduceMotion,
    blockOverride,
    interactionDisabled = false,
    layoutSpan = 1,
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
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
}) {
    const handleOpen = useCallback(() => {
        onOpen();
    }, [onOpen]);
    const press = useScrollSafePress({
        disabled: interactionDisabled,
        onPress: handleOpen,
        onPointerDown: prefetchHandlers?.onPointerDown,
    });
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
            ? HUB_HALF_TILE_MIN_CLASS
            : blockOverride?.heightPx
              ? ''
              : HUB_HALF_TILE_MIN_CLASS;
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent, size: tileSize, layoutSpan: 1 }),
        [accent, tileSize],
    );
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: HUB_HALF_TILE_BASE_PX,
            skipHeightPx: true,
            skipContentScale: true,
            skipGlassPaint: true,
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
    const ariaLabel = resolveDockShellItemAriaLabel(widgetId, label, badgeContext);
    const hoverPrefetch = interactionDisabled ? undefined : prefetchHandlers?.onPointerEnter;
    const focusPrefetch = interactionDisabled ? undefined : prefetchHandlers?.onFocus;

    return (
        <button
            type="button"
            data-hami-block={widgetId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`home-dock-${widgetId}`}
            aria-label={ariaLabel}
            onPointerEnter={hoverPrefetch}
            onFocus={focusPrefetch}
            onPointerDown={press.onPointerDown}
            onPointerMove={press.onPointerMove}
            onPointerUp={press.onPointerUp}
            onPointerCancel={press.onPointerCancel}
            onClick={press.onClick}
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
            <HomeBlockPatternOverlay
                blockId={widgetId}
                override={blockOverride}
                themePrimary={cardThemePrimary}
            />
            {showTasksBadge ? (
                <span className="hami-hub-tile-pip" aria-hidden />
            ) : null}
            <HubTileFace label={label} visuals={tileVisuals} hideInLayoutEdit={interactionDisabled} />
        </button>
    );
});
