/** نسبة إطار الهاتف — تطابق غطاء لوحة المحامي */
export const WALLPAPER_EDITOR_ASPECT = 9 / 19.5;

export const WALLPAPER_EXPORT_WIDTH = 960;
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

export function canvasToWallpaperDataUrl(canvas: HTMLCanvasElement): string {
    let quality = 0.72;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > WALLPAPER_EXPORT_MAX_BYTES && quality > 0.5) {
        quality -= 0.04;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > WALLPAPER_EXPORT_MAX_BYTES) {
        throw new Error('image too large');
    }
    return dataUrl;
}

export async function loadWallpaperImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = url;
    });
}

export async function renderWallpaperDataUrlFromFile(
    file: File,
    transform: WallpaperEditorTransform,
): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadWallpaperImageFromUrl(url);
        const canvas = renderWallpaperCanvas(img, transform);
        return canvasToWallpaperDataUrl(canvas);
    } finally {
        URL.revokeObjectURL(url);
    }
}
