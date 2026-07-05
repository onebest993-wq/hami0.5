import type { ThemeMode, ThemeKey } from '@/app/types/common';
import type { AppSettingsState, SecuritySettings } from './types';
import { normalizeGlassOpacity } from './surfaceAppearance';
import { applyLawyerThemeCssVars, LAWYER_THEME_TOKENS } from './lawyerThemeTokens';
import { applyLitePerformanceDataset } from '@/app/runtime/devicePerformanceTier';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    BUILTIN_COMPACT_MODE,
    BUILTIN_NOTIFICATIONS_ENABLED,
    BUILTIN_PUSH_ENABLED,
    BUILTIN_VIEW_MODE_DEFAULT,
    BUILTIN_WATERMARK_EXPORT,
    isWithinBuiltInQuietHours,
    loadPersistedViewMode,
} from './builtInBehavior';

export function resolveThemeMode(themeMode: ThemeMode): 'light' | 'dark' {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

const WALLPAPER_KEY = 'lawyer_wallpaper';

/** ذاكرة مؤقتة — تجنّب قراءة localStorage وdecode متكرر على كل render */
let wallpaperCache: string | undefined | null = null;

export function invalidateWallpaperCache(): void {
    wallpaperCache = null;
}

function readLegacyWallpaperFromLocalStorage(): string | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
        const legacy = localStorage.getItem(WALLPAPER_KEY);
        return legacy?.startsWith('data:') ? legacy : undefined;
    } catch {
        return undefined;
    }
}

function clearLegacyWallpaperLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(WALLPAPER_KEY);
    } catch {
        /* ignore */
    }
}

export function persistWallpaper(dataUrl: string | undefined): boolean {
    try {
        if (dataUrl) {
            SecureStoreService.setItemSync(WALLPAPER_KEY, dataUrl);
            clearLegacyWallpaperLocalStorage();
            wallpaperCache = dataUrl;
        } else {
            SecureStoreService.deleteItemSync(WALLPAPER_KEY);
            clearLegacyWallpaperLocalStorage();
            wallpaperCache = undefined;
        }
        return true;
    } catch {
        return false;
    }
}

export function loadPersistedWallpaper(): string | undefined {
    if (wallpaperCache !== null) return wallpaperCache;
    try {
        const synced = SecureStoreService.getItemSync(WALLPAPER_KEY);
        if (synced?.startsWith('data:')) {
            wallpaperCache = synced;
            return synced;
        }
        const legacy = readLegacyWallpaperFromLocalStorage();
        if (legacy) {
            SecureStoreService.setItemSync(WALLPAPER_KEY, legacy);
            clearLegacyWallpaperLocalStorage();
            wallpaperCache = legacy;
            return legacy;
        }
        wallpaperCache = undefined;
        return undefined;
    } catch {
        wallpaperCache = undefined;
        return undefined;
    }
}

/** استعادة خلفية مخزّنة مشفّرة/في IndexedDB — بعد ensureBootShellReady */
export async function hydrateWallpaperFromSecureStore(): Promise<string | undefined> {
    const synced = loadPersistedWallpaper();
    if (synced) return synced;
    try {
        await SecureStoreService.ensureBootShellReady();
        const asyncVal = await SecureStoreService.getItem(WALLPAPER_KEY);
        if (!asyncVal?.startsWith('data:')) return undefined;
        persistWallpaper(asyncVal);
        return asyncVal;
    } catch {
        return undefined;
    }
}

export function resolveWallpaperSrc(
    appearance?: Pick<AppSettingsState['appearance'], 'wallpaper' | 'wallpaperStamp'>,
): string | undefined {
    if (appearance?.wallpaper) return appearance.wallpaper;
    void appearance?.wallpaperStamp;
    return loadPersistedWallpaper();
}

export function hasPersistedWallpaper(): boolean {
    return Boolean(loadPersistedWallpaper());
}

/** لون سطح معتم — لا يُخلط مع transparent عند وجود صورة خلفية */
const WALLPAPER_SOLID_SURFACE = '#0B1021';

export function applyWallpaperSurfaceVars(hasWallpaper: boolean, themeKey: ThemeKey): void {
    const t = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    const root = document.documentElement;
    if (hasWallpaper) {
        root.style.setProperty('--hami-surface-bg', WALLPAPER_SOLID_SURFACE);
        root.dataset.hamiWallpaper = '1';
    } else {
        root.style.setProperty('--hami-surface-bg', t.bg);
        root.dataset.hamiWallpaper = '0';
    }
}

/** Apply settings to document root / body (call on change + mount). */
export function applySettingsToDom(settings: AppSettingsState) {
    const root = document.documentElement;
    const { appearance, performance } = settings;

    root.style.setProperty('--glass-opacity', String(normalizeGlassOpacity(appearance.glassOpacity)));
    root.dataset.hamiHomeContainerBorder = appearance.homeContainerBorder !== false ? '1' : '0';
    root.style.setProperty('--hami-brand', appearance.brandColor);
    root.style.setProperty('--hami-font-size', `${appearance.fontSize}px`);
    applyLawyerThemeCssVars(appearance.theme as ThemeKey);
    const wallpaper = loadPersistedWallpaper();
    applyWallpaperSurfaceVars(Boolean(wallpaper), appearance.theme as ThemeKey);
    root.dataset.hamiTheme = appearance.theme;
    root.dataset.hamiShape = appearance.shape;
    const colorMode = resolveThemeMode(appearance.themeMode);
    root.dataset.hamiColorMode = colorMode;
    root.dataset.hamiLang = appearance.language;
    document.documentElement.lang = appearance.language === 'en' ? 'en' : 'ar';
    document.documentElement.dir = appearance.language === 'en' ? 'ltr' : 'rtl';
    root.dataset.hamiViewMode = loadPersistedViewMode() ?? BUILTIN_VIEW_MODE_DEFAULT;
    root.dataset.hamiCompact = BUILTIN_COMPACT_MODE ? '1' : '0';
    root.dataset.hamiHighContrast = appearance.highContrast ? '1' : '0';
    root.dataset.hamiReduceMotion = appearance.reduceMotion || !performance.enableAnimations ? '1' : '0';

    root.dataset.hamiBgPreset = appearance.backgroundPreset ?? 'none';
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';

    if (appearance.reduceMotion || !performance.enableAnimations) {
        root.classList.add('reduce-motion');
    } else {
        root.classList.remove('reduce-motion');
    }

    if (appearance.highContrast) {
        root.classList.add('hami-high-contrast');
    } else {
        root.classList.remove('hami-high-contrast');
    }

    if (BUILTIN_COMPACT_MODE) {
        root.classList.add('hami-compact');
    } else {
        root.classList.remove('hami-compact');
    }

    if (BUILTIN_WATERMARK_EXPORT) {
        root.classList.add('hami-watermark-export');
    } else {
        root.classList.remove('hami-watermark-export');
    }

    root.dataset.hamiLocalOnly = settings.security.localOnlyMode ? '1' : '0';
    applyLitePerformanceDataset(settings.performance.litePerformance);
}

export function isWithinQuietHours(_settings?: AppSettingsState, now = new Date()): boolean {
    return isWithinBuiltInQuietHours(now);
}

export function shouldAllowPush(settings: AppSettingsState): boolean {
    return shouldAllowPushFromSecurity(settings.security);
}

export function shouldAllowPushFromSecurity(security: SecuritySettings): boolean {
    if (security.localOnlyMode) return false;
    return BUILTIN_NOTIFICATIONS_ENABLED && BUILTIN_PUSH_ENABLED && !isWithinBuiltInQuietHours();
}
