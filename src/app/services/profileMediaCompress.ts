/** ضغط صور الملف/الخلفية — بلا SecureAPI/LawyerStorage حتى لا تسحب Appearance إلى SAC. */

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
/** يطابق MAX_DATA_IMAGE_LEN في profileUrlSanitize — وإلا يفشل الرفع بعد ضغط ناجح */
const MAX_DATA_URL_BYTES = 512_000;

const WALLPAPER_MAX_EDGE = 960;
const WALLPAPER_JPEG_QUALITY = 0.72;
const WALLPAPER_MAX_BYTES = 480_000;

/** خلفية لوحة الملف — أعلى دقة ممكنة للتخزين المحلي */
const CANVAS_BG_MAX_EDGE = 3840;
const CANVAS_BG_JPEG_QUALITY = 0.96;
const CANVAS_BG_MAX_BYTES = 2_500_000;

type CompressImageOptions = {
    maxEdge?: number;
    quality?: number;
    maxBytes?: number;
    mime?: 'image/jpeg' | 'image/png';
};

export async function compressImageToDataUrl(file: File, opts?: CompressImageOptions): Promise<string> {
    const maxEdge = opts?.maxEdge ?? MAX_EDGE;
    const initialQuality = opts?.quality ?? JPEG_QUALITY;
    const maxBytes = opts?.maxBytes ?? MAX_DATA_URL_BYTES;
    const outputMime = opts?.mime ?? 'image/jpeg';
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            sourceWidth = bitmap.width;
            sourceHeight = bitmap.height;
            drawSource = (ctx, w, h) => {
                ctx.drawImage(bitmap, 0, 0, w, h);
                bitmap.close();
            };
        } catch {
            /* fallback below */
        }
    }

    if (!sourceWidth) {
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('image load failed'));
                img.src = objectUrl;
            });
            sourceWidth = image.naturalWidth || image.width;
            sourceHeight = image.naturalHeight || image.height;
            drawSource = (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h);
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    if (!sourceWidth || !sourceHeight || !drawSource!) throw new Error('invalid dimensions');

    let w = sourceWidth;
    let h = sourceHeight;
    const ratio = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    drawSource(ctx, w, h);

    let quality = initialQuality;
    let dataUrl = canvas.toDataURL(outputMime, outputMime === 'image/png' ? undefined : quality);
    if (outputMime === 'image/jpeg') {
        while (dataUrl.length > maxBytes && quality > 0.82) {
            quality -= 0.04;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
    } else if (dataUrl.length > maxBytes) {
        throw new Error('image too large');
    }
    if (dataUrl.length > maxBytes) {
        throw new Error('image too large');
    }
    return dataUrl;
}

/** ضغط أخف لخلفية اللوحة — أداء أفضل في localStorage والرسم */
export async function compressWallpaperToDataUrl(file: File): Promise<string> {
    return compressImageToDataUrl(file, {
        maxEdge: WALLPAPER_MAX_EDGE,
        quality: WALLPAPER_JPEG_QUALITY,
        maxBytes: WALLPAPER_MAX_BYTES,
    });
}

/** خلفية لوحة الكتابة في الملف — دقة عالية عند التخزين المحلي */
export async function compressCanvasBackgroundToDataUrl(file: File): Promise<string> {
    const preferPng = file.type === 'image/png';
    if (preferPng) {
        return compressImageToDataUrl(file, {
            maxEdge: CANVAS_BG_MAX_EDGE,
            quality: 1,
            maxBytes: CANVAS_BG_MAX_BYTES,
            mime: 'image/png',
        });
    }
    return compressImageToDataUrl(file, {
        maxEdge: CANVAS_BG_MAX_EDGE,
        quality: CANVAS_BG_JPEG_QUALITY,
        maxBytes: CANVAS_BG_MAX_BYTES,
    });
}
