import type { CSSProperties } from 'react';
import type { AppearanceSettings } from '@/app/services/settings/types';
import { resolveLawyerDashboardCanvasBg } from '@/app/services/settings/boardSurfaceResolve';
import { resolveWallpaperSrc } from '@/app/services/settings/apply';
import { resolvePatternOverlayStyle } from '@/app/services/settings/surfaceAppearance';

export function hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '').trim();
    const a = Math.min(1, Math.max(0, alpha));
    const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(h);
    if (!m) return `rgba(0,0,0,${a})`;
    const raw = m[1];
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

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
