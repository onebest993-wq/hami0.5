/** نسبة إطار الهاتف — تطابق غطاء لوحة المحامي */
export const WALLPAPER_EDITOR_ASPECT = 9 / 19.5;

const WALLPAPER_EXPORT_WIDTH = 960;
export const WALLPAPER_EXPORT_MAX_BYTES = 480_000;

export type WallpaperEditorTransform = {
    /** مضاعف فوق ملء الإطار — 1 = cover افتراضي */
    scale: number;
    /** -1…1 أفقي */
    offsetX: number;
    /** -1…1 عمودي */
    offsetY: number;
};

export const WALLPAPER_EDITOR_DEFAULT_TRANSFORM: WallpaperEditorTransform = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
};

export function clampWallpaperEditorTransform(
    transform: WallpaperEditorTransform,
): WallpaperEditorTransform {
    return {
        scale: Math.min(3, Math.max(1, transform.scale)),
        offsetX: Math.min(1, Math.max(-1, transform.offsetX)),
        offsetY: Math.min(1, Math.max(-1, transform.offsetY)),
    };
}

export function computeWallpaperCoverLayout(
    imgW: number,
    imgH: number,
    frameW: number,
    frameH: number,
    transform: WallpaperEditorTransform,
): {
    drawW: number;
    drawH: number;
    maxPanX: number;
    maxPanY: number;
    left: number;
    top: number;
} {
    const { scale, offsetX, offsetY } = clampWallpaperEditorTransform(transform);
    const coverScale = Math.max(frameW / imgW, frameH / imgH);
    const drawScale = coverScale * scale;
    const drawW = imgW * drawScale;
    const drawH = imgH * drawScale;
    const maxPanX = Math.max(0, (drawW - frameW) / 2);
    const maxPanY = Math.max(0, (drawH - frameH) / 2);
    const left = (frameW - drawW) / 2 + offsetX * maxPanX;
    const top = (frameH - drawH) / 2 + offsetY * maxPanY;
    return { drawW, drawH, maxPanX, maxPanY, left, top };
}

export function renderWallpaperCanvas(
    img: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight' | 'width' | 'height'>,
    transform: WallpaperEditorTransform,
    aspect = WALLPAPER_EDITOR_ASPECT,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const outW = WALLPAPER_EXPORT_WIDTH;
    const outH = Math.round(outW / aspect);
    canvas.width = outW;
    canvas.height = outH;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const { left, top, drawW, drawH } = computeWallpaperCoverLayout(
        imgW,
        imgH,
        outW,
        outH,
        transform,
    );

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(img as CanvasImageSource, left, top, drawW, drawH);
    return canvas;
}

export function canvasToWallpaperDataUrl(canvas: HTMLCanvasElement): Promise<string> {
    const minQuality = 0.5;
    const maxQuality = 0.72;
    let low = minQuality;
    let high = maxQuality;

    const yieldToMain = (): Promise<void> =>
        new Promise((resolve) => {
            const sched = (
                globalThis as unknown as {
                    scheduler?: { yield?: () => Promise<void> };
                }
            ).scheduler;
            if (sched?.yield) {
                void sched.yield().then(resolve, () => {
                    setTimeout(resolve, 0);
                });
                return;
            }
            setTimeout(resolve, 0);
        });

    return (async () => {
        let best = canvas.toDataURL('image/jpeg', high);
        if (!best) throw new Error('canvas export failed');

        if (best.length <= WALLPAPER_EXPORT_MAX_BYTES) {
            return best;
        }

        for (let i = 0; i < 6; i++) {
            await yieldToMain();
            const mid = (low + high) / 2;
            const candidate = canvas.toDataURL('image/jpeg', mid);
            if (candidate.length <= WALLPAPER_EXPORT_MAX_BYTES) {
                best = candidate;
                low = mid;
            } else {
                high = mid;
            }
        }

        if (best.length > WALLPAPER_EXPORT_MAX_BYTES) {
            throw new Error('image too large');
        }
        return best;
    })();
}

export async function loadWallpaperImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = url;
    });
}
