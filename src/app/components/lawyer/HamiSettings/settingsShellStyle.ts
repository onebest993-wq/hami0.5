import {
    LAWYER_WALLPAPER_CHROME_BG,
    LAWYER_THEME_TOKENS,
    hexToRgba,
    resolveLawyerSurfaceBaseColor,
    resolveWallpaperSrc,
    type AppSettingsState,
} from '@/app/services/settings';

/** سطح ثابت لمركز الإعدادات — لا يتبع ثيم اللوحة (يمنع وميض بني/ذهبي عند الفتح) */
export const SETTINGS_SHELL_CHROME = LAWYER_WALLPAPER_CHROME_BG;

export function resolveSettingsShellStyle(appearance: AppSettingsState['appearance']) {
    const wallpaperSrc = resolveWallpaperSrc(appearance);
    const hasWallpaper = !!wallpaperSrc;
    const themeToken = LAWYER_THEME_TOKENS[appearance.theme] ?? LAWYER_THEME_TOKENS.gold;
    const shellBg = resolveLawyerSurfaceBaseColor(appearance.theme, 'dark', hasWallpaper);
    const headerTint = hasWallpaper ? 'rgba(11, 16, 33, 0.88)' : hexToRgba(themeToken.bg, 0.16);

    return { wallpaperSrc, hasWallpaper, shellBg, headerTint };
}
