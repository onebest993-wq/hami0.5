import { resolveGlassPanelBackground, resolveGlassPatternScale } from './glassSurfacePaint';
import type { HomeBlockStyleOverride } from './homeLayout';
import { normalizeGlassOpacity } from './surfaceAppearance';
import type { AppSettingsState } from './types';

function readCssVar(el: Element, name: string, fallback = ''): string {
    if (el instanceof HTMLElement) {
        const inline = el.style.getPropertyValue(name).trim();
        if (inline) return inline;
    }
    const computed = getComputedStyle(el).getPropertyValue(name).trim();
    return computed || fallback;
}

/**
 * يحدّث شفافية البطاقات مباشرة على DOM — يضمن التطبيق الفوري حتى خلف طبقة الإعدادات.
 */
export function syncDashboardBlockGlassPaint(settings: AppSettingsState): void {
    if (typeof document === 'undefined') return;

    const dashboard = document.querySelector('[data-hami-lawyer-dashboard]');
    if (!dashboard) return;

    const root = document.documentElement;
    const hasWallpaper =
        typeof document !== 'undefined' && document.documentElement.dataset.hamiWallpaper === '1';
    const boardBg = readCssVar(root, '--hami-board-surface-bg', '#0A0F1C');
    const globalGlass = normalizeGlassOpacity(settings.appearance.glassOpacity);
    const overrides = settings.homeLayout.overrides;
    const fallbackSurface = readCssVar(root, '--hami-glass-base', '#020408');

    dashboard.querySelectorAll<HTMLElement>('[data-hami-block]').forEach((el) => {
        const blockId = el.dataset.hamiBlock;
        const override: HomeBlockStyleOverride | undefined = blockId
            ? overrides[blockId as keyof typeof overrides]
            : undefined;
        const glassOpacity =
            override?.glassOpacity !== undefined
                ? normalizeGlassOpacity(override.glassOpacity)
                : globalGlass;

        const surfaceBg = readCssVar(el, '--hami-block-surface-bg', fallbackSurface);
        const panelBg = resolveGlassPanelBackground(surfaceBg, boardBg, glassOpacity, hasWallpaper);
        const patternScale = resolveGlassPatternScale(glassOpacity);

        el.style.setProperty('--glass-opacity', String(glassOpacity));
        el.style.setProperty('--hami-glass-panel-bg', panelBg);
        el.style.setProperty('--hami-glass-pattern-scale', String(patternScale));
        el.style.removeProperty('background-color');
    });
}
