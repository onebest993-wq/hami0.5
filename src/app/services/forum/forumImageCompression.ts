const MAX_DIMENSION_PX = 2048;
const COMPRESS_THRESHOLD_BYTES = 1_500_000;
const JPEG_QUALITY = 0.85;

/** صيَغ لا تُضغط: GIF (حركة)، SVG (متجه)، وغير الصور */
function isCompressibleImage(file: File): boolean {
    const type = file.type.toLowerCase();
    if (!type.startsWith('image/')) return false;
    if (type === 'image/gif' || type === 'image/svg+xml') return false;
    return true;
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
    try {
        if (typeof createImageBitmap === 'function') {
            return await createImageBitmap(file);
        }
    } catch {
        /* HEIC وغيرها قد تفشل — نجرب <img> */
    }
    try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
        URL.revokeObjectURL(url);
        return loaded;
    } catch {
        return null;
    }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        try {
            canvas.toBlob((blob) => resolve(blob), type, quality);
        } catch {
            resolve(null);
        }
    });
}

/**
 * يضغط صورة المرفق قبل الرفع — تصغير للأبعاد القصوى وإعادة ترميز JPEG.
 * يعيد الملف الأصلي عند الفشل أو إذا كانت النتيجة أكبر (لا يفشل النشر أبداً).
 */
export async function compressForumImageFile(file: File): Promise<File> {
    if (!isCompressibleImage(file)) return file;

    let source: ImageBitmap | HTMLImageElement | null = null;
    try {
        source = await decodeImage(file);
        if (!source) return file;

        const width = source.width;
        const height = source.height;
        if (!width || !height) return file;

        const needsResize = Math.max(width, height) > MAX_DIMENSION_PX;
        const needsRecode = file.size > COMPRESS_THRESHOLD_BYTES;
        if (!needsResize && !needsRecode) return file;

        const scale = needsResize ? MAX_DIMENSION_PX / Math.max(width, height) : 1;
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(source, 0, 0, targetW, targetH);

        const hasAlpha = file.type.toLowerCase() === 'image/png';
        const outType = hasAlpha ? 'image/webp' : 'image/jpeg';
        const blob =
            (await canvasToBlob(canvas, outType, JPEG_QUALITY)) ??
            (await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY));
        if (!blob || blob.size === 0) return file;
        if (blob.size >= file.size) return file;

        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
        return new File([blob], `${baseName}.${ext}`, { type: blob.type });
    } catch {
        return file;
    } finally {
        if (source && 'close' in source) {
            try {
                (source as ImageBitmap).close();
            } catch {
                /* ignore */
            }
        }
    }
}
