import { normalizeGlassOpacity } from './surfaceAppearance';

type Rgb = { r: number; g: number; b: number };

function parseHexColor(input: string): Rgb | null {
    const hex = input.trim();
    const short = hex.match(/^#?([0-9a-f]{3})$/i);
    if (short) {
        const [r, g, b] = short[1].split('').map((c) => parseInt(c + c, 16));
        return { r, g, b };
    }
    const full = hex.match(/^#?([0-9a-f]{6})$/i);
    if (full) {
        const n = parseInt(full[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const rgb = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
        return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
    }
    return null;
}

/** مزج لونين hex — fgWeight: نسبة اللون الأمامي (0–1) */
export function mixHexColors(fg: string, bg: string, fgWeight: number): string {
    const a = parseHexColor(fg);
    const b = parseHexColor(bg);
    if (!a || !b) return fg;
    const t = Math.min(1, Math.max(0, fgWeight));
    const r = Math.round(a.r * t + b.r * (1 - t));
    const g = Math.round(a.g * t + b.g * (1 - t));
    const bl = Math.round(a.b * t + b.b * (1 - t));
    return `rgb(${r}, ${g}, ${bl})`;
}

/** لمسة لون على سطح — tintWeight نسبة لون اللمسة */
export function tintHex(base: string, tint: string, tintWeight: number): string {
    return mixHexColors(tint, base, tintWeight);
}

export function hexToRgba(hex: string, alpha: number): string {
    const c = parseHexColor(hex);
    if (!c) return hex;
    const a = Math.min(1, Math.max(0, alpha));
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
}

/** Android WebView — rgba داخل var(--hami-glass-panel-bg) غير موثوق مع !important */
export function isAndroidNativeGlassPaint(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return root.dataset.hamiNative === '1' && root.dataset.hamiPlatform === 'android';
}

/**
 * لون خلفية البطاقة الزجاجية.
 * - Android بلا خلفية: rgb ممزوج (موثوق في WebView)
 * - خلفية wallpaper / الويب: rgba شفاف
 */
export function resolveGlassPanelBackground(
    blockSurfaceHex: string,
    boardBgHex: string,
    glassOpacityRaw: unknown,
    hasWallpaper = false,
): string {
    const glassOpacity = normalizeGlassOpacity(glassOpacityRaw);

    if (isAndroidNativeGlassPaint() && !hasWallpaper) {
        return mixHexColors(blockSurfaceHex, boardBgHex, glassOpacity);
    }

    if (hasWallpaper) {
        const alpha = 0.02 + glassOpacity * 0.88;
        return hexToRgba(blockSurfaceHex, alpha);
    }

    const alpha = 0.03 + glassOpacity * 0.85;
    return hexToRgba(blockSurfaceHex, alpha);
}

/** نقوش خفيفة عند الشفافية العالية — أوضح عند «واضح» */
export function resolveGlassPatternScale(glassOpacityRaw: unknown): number {
    const glassOpacity = normalizeGlassOpacity(glassOpacityRaw);
    return 0.18 + glassOpacity * 0.72;
}
