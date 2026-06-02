import type { ThemeMode, ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from './types';
import { applyLawyerThemeCssVars } from './lawyerThemeTokens';

export function resolveThemeMode(themeMode: ThemeMode): 'light' | 'dark' {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

const WALLPAPER_KEY = 'lawyer_wallpaper';

export function persistWallpaper(dataUrl: string | undefined) {
    try {
        if (dataUrl) localStorage.setItem(WALLPAPER_KEY, dataUrl);
        else localStorage.removeItem(WALLPAPER_KEY);
    } catch {
        /* quota / private mode */
    }
}

export function loadPersistedWallpaper(): string | undefined {
    try {
        return localStorage.getItem(WALLPAPER_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

/** Apply settings to document root / body (call on change + mount). */
export function applySettingsToDom(settings: AppSettingsState) {
    const root = document.documentElement;
    const { appearance, performance } = settings;

    root.style.setProperty('--glass-opacity', String(appearance.glassOpacity));
    root.style.setProperty('--hami-brand', appearance.brandColor);
    root.style.setProperty('--hami-font-size', `${appearance.fontSize}px`);
    applyLawyerThemeCssVars(appearance.theme as ThemeKey);
    root.dataset.hamiTheme = appearance.theme;
    root.dataset.hamiShape = appearance.shape;
    const colorMode = resolveThemeMode(appearance.themeMode);
    root.dataset.hamiColorMode = colorMode;
    root.dataset.hamiLang = appearance.language;
    document.documentElement.lang = appearance.language === 'en' ? 'en' : 'ar';
    document.documentElement.dir = appearance.language === 'en' ? 'ltr' : 'rtl';
    root.dataset.hamiViewMode = settings.workflow.viewMode;
    root.dataset.hamiCompact = settings.workflow.compactMode ? '1' : '0';
    root.dataset.hamiHighContrast = appearance.highContrast ? '1' : '0';
    root.dataset.hamiReduceMotion = appearance.reduceMotion || !performance.enableAnimations ? '1' : '0';

    const wallpaper = appearance.wallpaper ?? loadPersistedWallpaper();
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

    if (settings.workflow.compactMode) {
        root.classList.add('hami-compact');
    } else {
        root.classList.remove('hami-compact');
    }

    if (settings.workflow.watermark) {
        root.classList.add('hami-watermark-export');
    } else {
        root.classList.remove('hami-watermark-export');
    }
}

export function isWithinQuietHours(settings: AppSettingsState, now = new Date()): boolean {
    if (!settings.notifications.quietHours) return false;
    const [sh, sm] = settings.notifications.quietHoursStart.split(':').map(Number);
    const [eh, em] = settings.notifications.quietHoursEnd.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    if (start <= end) return mins >= start && mins < end;
    return mins >= start || mins < end;
}

export function shouldAllowPush(settings: AppSettingsState): boolean {
    return (
        settings.notifications.master &&
        settings.notifications.pushEnabled &&
        !settings.security.decoyMode &&
        !isWithinQuietHours(settings)
    );
}
