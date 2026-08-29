/**
 * تحويل ملف الهوية إلى JPEG مضغوط يقبله الخادم (لا HEIC/نصوص أصلية للمتصفح).
 */

import { isIdentityImageDataUrl } from '@/app/services/auth/identityImageDataUrl';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;
const MIN_OUTPUT_CHARS = 120;
const MAX_SOURCE_BYTES = 4_500_000;

function readFileAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('تعذّر فتح الصورة — استخدم JPG أو PNG'));
        image.src = src;
    });
}

function fitEdge(width: number, height: number, maxEdge: number): { width: number; height: number } {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const edge = Math.max(w, h);
    if (edge <= maxEdge) return { width: w, height: h };
    const scale = maxEdge / edge;
    return {
        width: Math.max(1, Math.round(w * scale)),
        height: Math.max(1, Math.round(h * scale)),
    };
}

async function canvasJpegDataUrl(
    draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
    width: number,
    height: number,
): Promise<string> {
    const size = fitEdge(width, height, MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذّر تجهيز الصورة');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    draw(ctx, size.width, size.height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    if (!isIdentityImageDataUrl(dataUrl) || dataUrl.length < MIN_OUTPUT_CHARS) {
        throw new Error('تعذّر اعتماد الصورة — أعد الالتقاط بصيغة JPG أو PNG');
    }
    return dataUrl;
}

async function blobToJpegDataUrl(blob: Blob): Promise<string> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
            try {
                return await canvasJpegDataUrl(
                    (ctx, w, h) => {
                        ctx.drawImage(bitmap, 0, 0, w, h);
                    },
                    bitmap.width,
                    bitmap.height,
                );
            } finally {
                bitmap.close();
            }
        } catch {
            /* HTMLImage احتياط */
        }
    }
    const dataUrl = await readFileAsDataUrl(blob);
    const image = await loadHtmlImage(dataUrl);
    return canvasJpegDataUrl(
        (ctx, w, h) => {
            ctx.drawImage(image, 0, 0, w, h);
        },
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
    );
}

export async function fileToIdentityJpegDataUrl(file: File): Promise<string> {
    if (!file || file.size < 32) {
        throw new Error('الملف فارغ — أرفق صورة حقيقية لوجه أو ظهر الهوية');
    }
    if (file.size > MAX_SOURCE_BYTES) {
        throw new Error('حجم الصورة كبير — اختر صورة أوضح وأصغر من 4.5MB');
    }
    const type = String(file.type || '').toLowerCase();
    if (type && !type.startsWith('image/')) {
        throw new Error('يُقبل ملف صورة فقط');
    }
    return blobToJpegDataUrl(file);
}
