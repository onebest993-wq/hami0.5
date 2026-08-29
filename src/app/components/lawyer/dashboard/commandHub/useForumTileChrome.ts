import { useMemo, type CSSProperties } from 'react';
import { useLawyerSettingsAppearance } from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockAccent,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { resolveCardThemePrimary, mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';
import { dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import { shouldShowForumUnreadBadge } from '@/app/services/forum/forumShellNavigation';
import { hubTilePressClass, tileShellClasses } from './commandHubTileClasses';
import { HUB_HALF_TILE_BASE_PX, HUB_HALF_TILE_MIN_CLASS } from '@/app/components/lawyer/dashboard/hubHalfTileMetrics';

type UseForumTileChromeArgs = {
    forumUnreadCount: number;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    interactionDisabled: boolean;
};

export function useForumTileChrome({
    forumUnreadCount,
    reduceMotion,
    blockOverride,
    interactionDisabled,
}: UseForumTileChromeArgs) {
    const globalAppearance = useLawyerSettingsAppearance();
    const appearance = useMemo(
        () => mergeBlockScopedAppearance(globalAppearance, blockOverride),
        [globalAppearance, blockOverride],
    );
    const cardThemePrimary = resolveCardThemePrimary(appearance);
    const accent = resolveHomeBlockAccent(blockOverride, cardThemePrimary);
    const minH = HUB_HALF_TILE_MIN_CLASS;
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent, size: blockOverride?.size ?? 'normal', layoutSpan: 1 }),
        [accent, blockOverride?.size],
    );
    const style: CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, cardThemePrimary, {
            baseMinHeightPx: HUB_HALF_TILE_BASE_PX,
            skipHeightPx: true,
            skipContentScale: true,
            skipGlassPaint: true,
            appearance,
        }),
    } as CSSProperties;
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const forumLabel = dockShellLabel('forum');
    const unreadBadgeVisible = shouldShowForumUnreadBadge(forumUnreadCount) && !interactionDisabled;
    const shellClass = `${tileShellClasses(blockOverride, 'forum', minH, appearance.shape, containerBorderOn)} group${
        blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
    }${hubTilePressClass('route', reduceMotion, interactionDisabled)}`;
    const profileShellClass = `hami-forum-profile-shell ${tileShellClasses(blockOverride, 'forum', minH, appearance.shape, false)} group overflow-visible${hubTilePressClass('route', reduceMotion, interactionDisabled)}`;

    return {
        cardThemePrimary,
        tileVisuals,
        style,
        containerBorderOn,
        forumLabel,
        unreadBadgeVisible,
        shellClass,
        profileShellClass,
    };
}
