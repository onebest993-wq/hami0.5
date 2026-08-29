import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';

const decodedSources = new Set<string>();
let holdWallpaperCssImage = false;
const HOME_PAINT_FALLBACK_MS = 2_500;

function isHomeMainGridPaintedFlag(): boolean {
    return typeof window !== 'undefined' && window.__hamiHomeMainGridPainted__ === true;
}

/** يمنع حقن --hami-wallpaper-image حتى تُرسم شبكة المنزل */
export function holdWallpaperCssImageUntilHomePainted(): void {
    holdWallpaperCssImage = true;
}

export function isWallpaperCssImageHeld(): boolean {
    return holdWallpaperCssImage;
}

export function releaseWallpaperCssImageHold(): void {
    holdWallpaperCssImage = false;
}

/** بعد أول طلاء للشبكة — أو مهلة إن لم تُرسم (شاشة دخول) */
export function scheduleAfterHomeMainGridPaint(task: () => void): void {
    if (typeof window === 'undefined' || isHomeMainGridPaintedFlag()) {
        task();
        return;
    }
    let done = false;
    const run = () => {
        if (done) return;
        done = true;
        window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, run);
        window.clearTimeout(fallback);
        task();
    };
    const fallback = window.setTimeout(run, HOME_PAINT_FALLBACK_MS);
    window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, run, { once: true });
}

export function resetWallpaperPaintDeferralForTests(): void {
    holdWallpaperCssImage = false;
    decodedSources.clear();
}

/**
 * يضمن فك ترميز الصورة قبل رسمها كخلفية — يمنع وميض/فراغ أثناء paint.
 * يفشل بصمت (لا يحجب الإقلاع).
 */
export async function ensureWallpaperDecoded(src: string | undefined | null): Promise<void> {
    if (!src || typeof Image === 'undefined') return;
    if (decodedSources.has(src)) return;

    await new Promise<void>((resolve) => {
        const img = new Image();
        const finish = () => {
            decodedSources.add(src);
            resolve();
        };
        img.onload = () => {
            if (typeof img.decode === 'function') {
                void img.decode().then(finish).catch(finish);
                return;
            }
            finish();
        };
        img.onerror = finish;
        img.src = src;
    });
}

export function clearWallpaperDecodeCache(): void {
    decodedSources.clear();
}
