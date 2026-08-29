import type { CSSProperties } from 'react';
import type { AppearanceSettings } from '@/app/services/settings/types';
import { resolveLawyerDashboardCanvasBg } from '@/app/services/settings/boardSurfaceResolve';
import { resolveWallpaperSrc } from '@/app/services/settings/apply';
import { hexToRgba } from '@/app/services/settings/glassSurfacePaint';
import { resolvePatternOverlayStyle } from '@/app/services/settings/surfaceAppearance';

export function buildLawyerDashboardSurface({
    appearance,
    themeBg,
}: {
    appearance: AppearanceSettings;
    themeBg: string;
}) {
    const wallpaperSrc = resolveWallpaperSrc(appearance);
    const hasWallpaper = !!wallpaperSrc;
    const dashboardBg = resolveLawyerDashboardCanvasBg(appearance, hasWallpaper);
    const navBase = themeBg;
    const dashboardSurfaceStyle = {
        backgroundColor: 'var(--hami-board-surface-bg, #0a0f1c)',
    } as const;
    const navUnderlayStyle = {
        background: `linear-gradient(to top, ${navBase} 0%, ${hexToRgba(navBase, 0.94)} 60%, rgba(0,0,0,0) 100%)`,
    } as const;

    return {
        wallpaperSrc,
        hasWallpaper,
        dashboardBg,
        dashboardSurfaceStyle,
        navUnderlayStyle,
    };
}

/** لون + زخرفة اللوحة في طبقة CSS واحدة — بلا div منفصل */
export function mergeLawyerDashboardShellCanvasStyle(
    dashboardSurfaceStyle: CSSProperties,
    appearance: AppearanceSettings,
    boardPatternEnabled: boolean,
): CSSProperties {
    if (!boardPatternEnabled) return dashboardSurfaceStyle;
    const pattern = resolvePatternOverlayStyle(appearance, true);
    if (!pattern) return dashboardSurfaceStyle;
    const { opacity: _opacity, ...patternLayers } = pattern;
    return {
        ...dashboardSurfaceStyle,
        ...patternLayers,
    };
}
