import React, { memo, useCallback, useMemo } from 'react';
import { useLawyerSettingsAppearance } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockAccent,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    resolveHubTileMinHeight,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { resolveCardThemePrimary, mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';
import { buildHubTileAriaLabel } from '@/app/components/lawyer/dashboard/commandHub/buildHubTileAriaLabel';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { bindArchivePrefetch } from './commandHubArchivePrefetch';
import { hubTilePressClass, tileShellClasses, type HubCard } from './commandHubTileClasses';
import { HUB_HALF_TILE_BASE_PX, HUB_HALF_TILE_MIN_CLASS } from '@/app/components/lawyer/dashboard/hubHalfTileMetrics';
import { HubTileFace } from './commandHubTileChrome';
import { HomeBlockPatternOverlay } from '../HomeBlockPatternOverlay';

export const RouteTile = memo(function RouteTile({
    card,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    interactionDisabled = false,
    layoutSpan = 1,
    pressVariant = 'route',
    openActionLabel = 'فتح الأرشيف',
    accentHint,
}: {
    card: HubCard;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
    pressVariant?: 'route' | 'hero';
    openActionLabel?: string;
    /** يُفضَّل على لون المظهر عند تمريره (بلاطة التنفيذ) */
    accentHint?: string;
}) {
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const accent = resolveHomeBlockAccent(blockOverride, accentHint || cardThemePrimary);
    const tileSize = blockOverride?.size ?? 'normal';
    const minH =
        layoutSpan === 1
            ? HUB_HALF_TILE_MIN_CLASS
            : blockOverride?.heightPx
              ? ''
              : resolveHubTileMinHeight(card.tileId, tileSize);
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
            aria-label={buildHubTileAriaLabel(card.label, openActionLabel)}
            onPointerEnter={prefetchHandlers.onPointerEnter}
            onFocus={prefetchHandlers.onFocus}
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
            }${hubTilePressClass(pressVariant, reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay
                blockId={card.tileId}
                override={blockOverride}
                themePrimary={cardThemePrimary}
            />
            <HubTileFace
                label={card.label}
                visuals={tileVisuals}
                hideInLayoutEdit={interactionDisabled}
            />
        </button>
    );
});
