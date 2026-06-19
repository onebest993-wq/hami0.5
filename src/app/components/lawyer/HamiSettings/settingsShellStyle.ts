import {
    LAWYER_THEME_TOKENS,
    resolveLawyerSurfaceBaseColor,
    resolveWallpaperSrc,
    type AppSettingsState,
} from '@/app/services/settings';

export function hexToRgba(hex: string, alpha: number): string {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function resolveSettingsShellStyle(appearance: AppSettingsState['appearance']) {
    const wallpaperSrc = resolveWallpaperSrc(appearance);
    const hasWallpaper = !!wallpaperSrc;
    const themeToken = LAWYER_THEME_TOKENS[appearance.theme] ?? LAWYER_THEME_TOKENS.gold;
    const shellBg = resolveLawyerSurfaceBaseColor(appearance.theme, 'dark', hasWallpaper);
    const headerTint = hexToRgba(themeToken.bg, 0.16);

    return { wallpaperSrc, hasWallpaper, shellBg, headerTint };
}
