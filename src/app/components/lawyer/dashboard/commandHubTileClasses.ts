import type { HomeBlockStyleOverride, HomeHubTileId } from '@/app/services/settings/homeLayout';
import { resolveHomeBlockClassNames } from '@/app/services/settings/resolveHomeBlockStyle';

export type HubCard = {
    id: string;
    tileId: HomeHubTileId;
    label: string;
};

export const HUB_TILE_BUTTON_A11Y =
    'touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export function hubTilePressClass(
    variant: 'route' | 'hero',
    reduceMotion: boolean,
    interactionDisabled: boolean,
): string {
    if (reduceMotion || interactionDisabled) return '';
    return ` hami-hub-tile-press hami-hub-tile-press--${variant}`;
}

export function tileShellClasses(
    override: HomeBlockStyleOverride | undefined,
    tileId: HomeHubTileId | 'forum' | 'alerts',
    minH: string,
    globalShape: import('@/app/types/common').ShapeKey | undefined,
    containerBorderOn: boolean,
) {
    const borderCls = containerBorderOn ? 'border' : 'border-0';
    return `relative overflow-hidden ${borderCls} w-full text-right active:opacity-[0.88] ${HUB_TILE_BUTTON_A11Y} ${resolveHomeBlockClassNames(override, globalShape)} ${minH}`;
}
