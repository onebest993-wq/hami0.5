import { LawyerStorage } from '@/app/services/lawyer-cloud';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL_BYTES = 900_000;

export type ProfileMediaUploadResult = {
    displayUrl: string;
    storagePath?: string;
    source: 'cloud' | 'local';
};

async function compressImageToDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('image load failed'));
            img.src = objectUrl;
        });

        let w = image.naturalWidth || image.width;
        let h = image.naturalHeight || image.height;
        if (!w || !h) throw new Error('invalid dimensions');

        const ratio = Math.min(1, MAX_EDGE / Math.max(w, h));
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas unavailable');
        ctx.drawImage(image, 0, 0, w, h);

        let quality = JPEG_QUALITY;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > MAX_DATA_URL_BYTES && quality > 0.45) {
            quality -= 0.08;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > MAX_DATA_URL_BYTES) {
            throw new Error('image too large');
        }
        return dataUrl;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/** رفع صورة الملف: سحابة أولاً، ثم تخزين محلي مضغوط عند الفشل */
export async function uploadProfileMedia(userId: string, file: File): Promise<ProfileMediaUploadResult> {
    if (!file.type.startsWith('image/')) {
        throw new Error('نوع الملف غير مدعوم');
    }

    try {
        const res = await LawyerStorage.uploadSmartFile(userId, file, 'repository');
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

    const dataUrl = await compressImageToDataUrl(file);
    return { displayUrl: dataUrl, source: 'local' };
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
