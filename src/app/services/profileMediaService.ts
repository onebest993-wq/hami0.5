import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL_BYTES = 900_000;

const WALLPAPER_MAX_EDGE = 960;
const WALLPAPER_JPEG_QUALITY = 0.72;
const WALLPAPER_MAX_BYTES = 480_000;

type CompressImageOptions = {
    maxEdge?: number;
    quality?: number;
    maxBytes?: number;
};

export type ProfileMediaUploadResult = {
    displayUrl: string;
    storagePath?: string;
    source: 'cloud' | 'local';
};

export async function compressImageToDataUrl(file: File, opts?: CompressImageOptions): Promise<string> {
    const maxEdge = opts?.maxEdge ?? MAX_EDGE;
    const initialQuality = opts?.quality ?? JPEG_QUALITY;
    const maxBytes = opts?.maxBytes ?? MAX_DATA_URL_BYTES;
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
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > maxBytes && quality > 0.42) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
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

/** رفع صورة الملف: ضغط أولاً ثم سحابة، ثم تخزين محلي مضغوط عند الفشل */
export async function uploadProfileMedia(
    userId: string,
    file: File,
    opts?: { variant?: 'default' | 'canvasBg' },
): Promise<ProfileMediaUploadResult> {
    if (!file.type.startsWith('image/')) {
        throw new Error('نوع الملف غير مدعوم');
    }

    const compress =
        opts?.variant === 'canvasBg' ? compressWallpaperToDataUrl : compressImageToDataUrl;
    const dataUrl = await compress(file);
    const safe = sanitizeProfileMediaUrl(dataUrl);
    if (!safe) throw new Error('image too large');

    try {
        const blob = await (await fetch(safe)).blob();
        const compressedFile = new File(
            [blob],
            (file.name.replace(/\.[^.]+$/, '') || 'profile') + '.jpg',
            { type: 'image/jpeg' },
        );
        const res = await LawyerStorage.uploadSmartFile(userId, compressedFile, 'repository');
        if (res.downloadUrl) {
            return {
                displayUrl: res.downloadUrl,
                storagePath: res.path,
                source: 'cloud',
            };
        }
    } catch {
        // fallback below
    }

    return { displayUrl: safe, source: 'local' };
}

export async function refreshProfileMediaUrl(
    storagePath: string | undefined,
    currentUrl: string | undefined,
): Promise<string> {
    if (currentUrl?.startsWith('data:image/')) return currentUrl;
    if (!storagePath) return currentUrl || '';
    try {
        const signed = await LawyerStorage.getSignedUrl(storagePath);
        return signed || currentUrl || '';
    } catch {
        return currentUrl || '';
    }
}

export function profileMediaErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        if (err.message === 'image too large') return 'الصورة كبيرة جداً — اختر صورة أصغر';
        if (err.message === 'نوع الملف غير مدعوم') return err.message;
    }
    return 'فشل رفع الصورة — تحقق من الاتصال أو جرّب صورة أصغر';
}
