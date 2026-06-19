import type { AppearanceSettings } from '@/app/services/settings/types';
import { resolveLawyerSurfaceBaseColor, resolveWallpaperSrc } from '@/app/services/settings';

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
    const dashboardBg = resolveLawyerSurfaceBaseColor(
        appearance.theme,
        appearance.themeMode,
        hasWallpaper,
    );
    const dashboardSurfaceStyle = {
        backgroundColor: dashboardBg,
        fontSize: `${appearance.fontSize}px`,
    } as const;
    const navUnderlayStyle = {
        background: `linear-gradient(to top, ${themeBg} 0%, ${hexToRgba(themeBg, 0.94)} 60%, rgba(0,0,0,0) 100%)`,
    } as const;

    return {
        wallpaperSrc,
        hasWallpaper,
        dashboardBg,
        dashboardSurfaceStyle,
        navUnderlayStyle,
    };
}
