import {
    FONT_LAYOUT_BASE_PX,
    resolveUserFontScale,
} from '@/app/bootstrap/bootTypographyFlush';
import { isBootTypographyLocked, lockBootTypographyVars } from '@/app/bootstrap/bootTypographyLock';
import type { ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from './types';
import { normalizeGlassOpacity } from './surfaceAppearance';
import { applyLawyerThemeCssVars, LAWYER_THEME_TOKENS } from './lawyerThemeTokens';
import { resolveBoardThemeKey, resolveCardThemeKey, resolvePatternThemeKey } from './themeResolve';
import { resolveLawyerBoardChromeBg } from './boardSurfaceResolve';
import { LAWYER_WALLPAPER_CHROME_BG } from './surfaceApplyTarget';
import { applyLitePerformanceDataset } from '@/app/runtime/devicePerformanceTier';
import { persistBootSurfacePaintFromDom } from '@/app/services/settings/bootSurfacePaintCache';
import {
    installLocalOnlyNetworkIsolation,
    syncLocalOnlyFlagFromSettings,
} from '@/app/services/settings/localOnlyNetworkIsolation';
import { ensureWallpaperDecoded, isWallpaperCssImageHeld } from '@/app/services/settings/wallpaperPaintReady';
import { syncDashboardBlockGlassPaint } from './syncDashboardBlockGlassPaint';
import { opacityToGlassTransparency } from './glassTransparency';
import { resolveGlassPanelBackground, tintHex } from './glassSurfacePaint';
import { resolveThemeMode } from './resolveThemeMode';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    BUILTIN_COMPACT_MODE,
    BUILTIN_VIEW_MODE_DEFAULT,
    BUILTIN_WATERMARK_EXPORT,
    loadPersistedViewMode,
} from './builtInBehavior';

export { flushPendingBootTypography } from '@/app/bootstrap/bootTypographyFlush';
export { resolveThemeMode } from './resolveThemeMode';

const WALLPAPER_KEY = 'lawyer_wallpaper';

/** ذاكرة مؤقتة — تجنّب قراءة localStorage وdecode متكرر على كل render */
let wallpaperCache: string | undefined | null = null;

export function invalidateWallpaperCache(): void {
    wallpaperCache = null;
    void import('@/app/services/settings/wallpaperPaintReady').then((m) => m.clearWallpaperDecodeCache());
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
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(WALLPAPER_KEY, dataUrl);
                }
            } catch {
                /* ignore mirror */
            }
            wallpaperCache = dataUrl;
        } else {
            SecureStoreService.deleteItemSync(WALLPAPER_KEY);
            clearLegacyWallpaperLocalStorage();
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(WALLPAPER_KEY);
                }
            } catch {
                /* ignore mirror */
            }
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

/** لون سطح معتم — لا يُخلط مع transparent عند وجود صورة خلفية */
const WALLPAPER_SOLID_SURFACE = LAWYER_WALLPAPER_CHROME_BG;

function cssWallpaperUrl(src: string): string {
    return `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

function applyWallpaperSurfaceVars(
    hasWallpaper: boolean,
    themeKey: ThemeKey,
    wallpaperSrc?: string | null,
): void {
    const t = LAWYER_THEME_TOKENS[themeKey] ?? LAWYER_THEME_TOKENS.gold;
    const root = document.documentElement;
    if (hasWallpaper) {
        root.style.setProperty('--hami-surface-bg', WALLPAPER_SOLID_SURFACE);
        root.dataset.hamiWallpaper = '1';
        const src = wallpaperSrc ?? loadPersistedWallpaper();
        if (src && !isWallpaperCssImageHeld()) {
            root.style.setProperty('--hami-wallpaper-image', cssWallpaperUrl(src));
        }
    } else if (!isWallpaperCssImageHeld()) {
        root.style.setProperty('--hami-surface-bg', t.bg);
        root.dataset.hamiWallpaper = '0';
        root.style.removeProperty('--hami-wallpaper-image');
    } else {
        root.style.setProperty('--hami-surface-bg', t.bg);
    }
}

/** يفك ترميز الصورة ثم يطبّق متغيرات الخلفية — للإقلاع والرفع بلا وميض */
export async function applyWallpaperSurfaceVarsWhenReady(
    hasWallpaper: boolean,
    themeKey: ThemeKey,
    wallpaperSrc?: string | null,
): Promise<void> {
    if (hasWallpaper) {
        const src = wallpaperSrc ?? loadPersistedWallpaper();
        if (src) await ensureWallpaperDecoded(src);
    }
    applyWallpaperSurfaceVars(hasWallpaper, themeKey, wallpaperSrc);
}

/** Apply settings to document root / body (call on change + mount). */
/** تبديل تباين أعلى فقط — خفيف (لا يعيد حساب الثيم/الزجاج/الخلفية). */
export function applyHighContrastToDom(highContrast: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.hamiHighContrast = highContrast ? '1' : '0';
    root.classList.toggle('hami-high-contrast', highContrast);
}

/** حجم الخط فقط — بلا إعادة تطبيق الثيم/الزجاج. */
export function applyFontSizeToDom(fontSize: number): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isBootTypographyLocked(root)) {
        lockBootTypographyVars(root);
        root.dataset.hamiPendingFontPx = String(
            Number.isFinite(fontSize) ? fontSize : FONT_LAYOUT_BASE_PX,
        );
        return;
    }
    const px = Number.isFinite(fontSize) ? fontSize : FONT_LAYOUT_BASE_PX;
    root.style.setProperty('--hami-font-size', `${px}px`);
    root.style.setProperty('--hami-user-font-scale', String(resolveUserFontScale(px)));
    delete root.dataset.hamiPendingFontPx;
}

/** تقليل الحركة + animations dataset — خفيف. */
export function applyReduceMotionToDom(reduceMotion: boolean, enableAnimations: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.hamiReduceMotion = reduceMotion ? '1' : '0';
    root.dataset.hamiAnimations = !reduceMotion && enableAnimations ? '1' : '0';
    if (reduceMotion || !enableAnimations) {
        root.classList.add('reduce-motion');
    } else {
        root.classList.remove('reduce-motion');
    }
}

let settingsDomFastPathPending = false;

/** يُستدعى بعد تطبيق DOM خفيف من الإعدادات — يمنع إعادة applySettingsToDom الكاملة فوراً */
export function markSettingsDomFastPath(): void {
    settingsDomFastPathPending = true;
}

export function consumeSettingsDomFastPath(): boolean {
    if (!settingsDomFastPathPending) return false;
    settingsDomFastPathPending = false;
    return true;
}

/** للاختبارات */
export function resetSettingsDomFastPathForTests(): void {
    settingsDomFastPathPending = false;
}

/** ثيم اللوحة/البطاقات/النقوش — بلا لغة/أداء/أمان */
export function applyAppearanceThemeToDom(settings: AppSettingsState): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const { appearance } = settings;

    const boardTheme = resolveBoardThemeKey(appearance);
    const cardTheme = resolveCardThemeKey(appearance);
    const patternTheme = resolvePatternThemeKey(appearance);
    const boardToken = LAWYER_THEME_TOKENS[boardTheme] ?? LAWYER_THEME_TOKENS.gold;
    const cardToken = LAWYER_THEME_TOKENS[cardTheme] ?? LAWYER_THEME_TOKENS.gold;
    const patternToken = LAWYER_THEME_TOKENS[patternTheme] ?? LAWYER_THEME_TOKENS.gold;
    const wallpaper = loadPersistedWallpaper();
    const hasWallpaper = Boolean(wallpaper);
    const boardChromeBg = resolveLawyerBoardChromeBg(appearance, hasWallpaper);

    root.style.setProperty('--hami-brand', appearance.brandColor);
    applyLawyerThemeCssVars(boardTheme as ThemeKey);
    root.style.setProperty('--hami-board-surface-bg', boardChromeBg);
    root.style.setProperty('--hami-card-surface-bg', cardToken.bg);
    const glassBaseHex = tintHex(cardToken.bg, cardToken.primary, 0.16);
    root.style.setProperty('--hami-glass-base', glassBaseHex);
    root.style.setProperty(
        '--hami-glass-panel-bg',
        resolveGlassPanelBackground(glassBaseHex, boardChromeBg, appearance.glassOpacity, hasWallpaper),
    );
    root.style.setProperty('--hami-card-accent', cardToken.primary);
    root.style.setProperty('--hami-pattern-accent', patternToken.primary);
    applyWallpaperSurfaceVars(hasWallpaper, boardTheme as ThemeKey, wallpaper);
    root.dataset.hamiTheme = appearance.theme;

    const paintBg = boardChromeBg || boardToken.bg;
    root.style.backgroundColor = paintBg;
    document.body.style.backgroundColor = paintBg;
    syncDashboardBlockGlassPaint(settings);
}

/** شفافية/زخرفة/إطار — خفيف */
export function applyGlassSurfaceAppearanceToDom(settings: AppSettingsState): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const { appearance } = settings;
    const wallpaper = loadPersistedWallpaper();
    const hasWallpaper = Boolean(wallpaper);
    const cardTheme = resolveCardThemeKey(appearance);
    const cardToken = LAWYER_THEME_TOKENS[cardTheme] ?? LAWYER_THEME_TOKENS.gold;
    const boardChromeBg = resolveLawyerBoardChromeBg(appearance, hasWallpaper);

    root.style.setProperty('--glass-opacity', String(normalizeGlassOpacity(appearance.glassOpacity)));
    root.dataset.hamiGlassLevel = opacityToGlassTransparency(appearance.glassOpacity);
    root.dataset.hamiHomeContainerBorder = appearance.homeContainerBorder !== false ? '1' : '0';
    root.dataset.hamiBgPreset = appearance.backgroundPreset ?? 'none';

    const glassBaseHex = tintHex(cardToken.bg, cardToken.primary, 0.16);
    root.style.setProperty('--hami-glass-base', glassBaseHex);
    root.style.setProperty(
        '--hami-glass-panel-bg',
        resolveGlassPanelBackground(glassBaseHex, boardChromeBg, appearance.glassOpacity, hasWallpaper),
    );
    syncDashboardBlockGlassPaint(settings);
}

export function applyHomeLayoutOverridesToDom(settings: AppSettingsState): void {
    syncDashboardBlockGlassPaint(settings);
}

export function applySettingsToDom(settings: AppSettingsState) {
    const root = document.documentElement;
    const { appearance, performance } = settings;

    applyGlassSurfaceAppearanceToDom(settings);
    if (isBootTypographyLocked(root)) {
        lockBootTypographyVars(root);
        root.dataset.hamiPendingFontPx = String(appearance.fontSize);
    } else {
        root.style.setProperty('--hami-font-size', `${appearance.fontSize}px`);
        root.style.setProperty('--hami-user-font-scale', String(resolveUserFontScale(appearance.fontSize)));
        delete root.dataset.hamiPendingFontPx;
    }
    applyAppearanceThemeToDom(settings);
    root.dataset.hamiShape = appearance.shape;
    const colorMode = resolveThemeMode(appearance.themeMode);
    root.dataset.hamiColorMode = colorMode;
    root.dataset.hamiLang = appearance.language;
    document.documentElement.lang = appearance.language === 'en' ? 'en' : 'ar';
    document.documentElement.dir = appearance.language === 'en' ? 'ltr' : 'rtl';
    root.dataset.hamiViewMode = loadPersistedViewMode() ?? BUILTIN_VIEW_MODE_DEFAULT;
    root.dataset.hamiCompact = BUILTIN_COMPACT_MODE ? '1' : '0';
    root.dataset.hamiReduceMotion = appearance.reduceMotion ? '1' : '0';
    root.dataset.hamiAnimations =
        !appearance.reduceMotion && performance.enableAnimations ? '1' : '0';
    root.dataset.hamiPrefetch = performance.prefetchScreens ? '1' : '0';

    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';

    if (appearance.reduceMotion || !performance.enableAnimations) {
        root.classList.add('reduce-motion');
    } else {
        root.classList.remove('reduce-motion');
    }

    applyHighContrastToDom(appearance.highContrast);

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

    syncLocalOnlyFlagFromSettings(Boolean(settings.security.localOnlyMode));
    applyLitePerformanceDataset(settings.performance.litePerformance);

    persistBootSurfacePaintFromDom();
}

if (typeof window !== 'undefined') {
    installLocalOnlyNetworkIsolation();
}

export { shouldAllowPush, shouldAllowPushFromSecurity } from './pushPolicy';
