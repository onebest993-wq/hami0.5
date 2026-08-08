import type { AppearanceSettings } from './types';
import { resolveLawyerSurfaceBaseColor } from './surfaceAppearance';
import { LAWYER_WALLPAPER_CHROME_BG } from './surfaceApplyTarget';
import { resolveBoardThemeKey } from './themeResolve';

type BoardSurfaceAppearance = Pick<AppearanceSettings, 'theme' | 'themeMode'>;

/** سطح الهيدر والكروم — يتبع لون الواجهة الموحّد */
export function resolveLawyerBoardChromeBg(
    appearance: BoardSurfaceAppearance,
    hasWallpaper: boolean,
): string {
    if (hasWallpaper) return LAWYER_WALLPAPER_CHROME_BG;
    return resolveLawyerSurfaceBaseColor(
        resolveBoardThemeKey(appearance),
        appearance.themeMode,
        false,
    );
}

/** خلفية لوحة المحتوى — صلبة دائماً؛ صورة الخلفية تُعرض فقط على غطاء الرئيسية */
export function resolveLawyerDashboardCanvasBg(
    appearance: BoardSurfaceAppearance,
    hasWallpaper: boolean,
): string {
    if (hasWallpaper) return LAWYER_WALLPAPER_CHROME_BG;
    return resolveLawyerSurfaceBaseColor(
        resolveBoardThemeKey(appearance),
        appearance.themeMode,
        false,
    );
}
