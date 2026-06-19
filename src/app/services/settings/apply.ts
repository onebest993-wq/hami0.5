import type { ThemeMode, ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from './types';
import { normalizeGlassOpacity } from './surfaceAppearance';
import { applyLawyerThemeCssVars } from './lawyerThemeTokens';
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

export function persistWallpaper(dataUrl: string | undefined): boolean {
    try {
        if (dataUrl) localStorage.setItem(WALLPAPER_KEY, dataUrl);
        else localStorage.removeItem(WALLPAPER_KEY);
        return true;
    } catch {
        return false;
    }
}

export function loadPersistedWallpaper(): string | undefined {
    try {
        return localStorage.getItem(WALLPAPER_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

export function resolveWallpaperSrc(
    appearance: Pick<AppSettingsState['appearance'], 'wallpaper'>,
): string | undefined {
    return appearance.wallpaper ?? loadPersistedWallpaper();
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
    root.dataset.hamiBgPreset = appearance.backgroundPreset ?? 'none';
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

    const wallpaper = resolveWallpaperSrc(appearance);
    if (wallpaper) {
        document.body.style.backgroundImage = `url(${wallpaper})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    } else {
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundAttachment = '';
    }

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
}

export function isWithinQuietHours(_settings?: AppSettingsState, now = new Date()): boolean {
    return isWithinBuiltInQuietHours(now);
}

export function shouldAllowPush(settings: AppSettingsState): boolean {
    if (settings.security.localOnlyMode) return false;
    return BUILTIN_NOTIFICATIONS_ENABLED && BUILTIN_PUSH_ENABLED && !isWithinBuiltInQuietHours();
}
