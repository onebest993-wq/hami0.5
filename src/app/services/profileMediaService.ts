import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import { sanitizeProfileMediaUrl, sanitizeProfileCanvasMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    compressCanvasBackgroundToDataUrl,
    compressImageToDataUrl,
} from '@/app/services/profileMediaCompress';

export {
    compressImageToDataUrl,
    compressWallpaperToDataUrl,
    compressCanvasBackgroundToDataUrl,
} from '@/app/services/profileMediaCompress';

/** حد خام قبل الضغط — يمنع قراءة ملفات ضخمة/غير صور */
const MAX_SOURCE_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
]);

export type ProfileMediaUploadResult = {
    displayUrl: string;
    storagePath?: string;
    source: 'cloud' | 'local';
};

/** رفع صورة الملف: ضغط أولاً ثم سحابة، ثم تخزين محلي مضغوط عند الفشل */
export async function uploadProfileMedia(
    userId: string,
    file: File,
    opts?: { variant?: 'default' | 'canvasBg' },
): Promise<ProfileMediaUploadResult> {
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime) || mime.includes('svg')) {
        throw new Error('نوع الملف غير مدعوم');
    }
    if (file.size <= 0 || file.size > MAX_SOURCE_FILE_BYTES) {
        throw new Error('image too large');
    }

    if (opts?.variant === 'canvasBg') {
        try {
            const cloudRes = await LawyerStorage.uploadSmartFile(userId, file, 'repository');
            if (cloudRes.downloadUrl) {
                return {
                    displayUrl: cloudRes.downloadUrl,
                    storagePath: cloudRes.path,
                    source: 'cloud',
                };
            }
        } catch {
            /* fallback to high-fidelity local storage below */
        }

        const dataUrl = await compressCanvasBackgroundToDataUrl(file);
        const safe = sanitizeProfileCanvasMediaUrl(dataUrl);
        if (!safe) throw new Error('image too large');
        return { displayUrl: safe, source: 'local' };
    }

    const compress = compressImageToDataUrl;
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

function isRemoteProfileMediaPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:') || p.startsWith('data:')) return false;
    return true;
}

/** حذف أفضل جهد لملفات وسائط الملف — لا يرمي عند الفشل */
export async function removeProfileMediaPaths(paths: string[]): Promise<void> {
    const toRemove = [...new Set(paths.map((p) => p.trim()).filter(isRemoteProfileMediaPath))];
    if (toRemove.length === 0) return;
    try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        await SecureAPIClient.fetchSecure('/api/upload/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: toRemove }),
        });
    } catch {
        /* best-effort — لا نُفشِل تجربة المستخدم */
    }
}

/** إعادة توقيع صور الحاويات / خلفيات اللوحة دون حذف الكتل */
export async function refreshProfileCustomizationMedia(
    customization: ProfilePageCustomization | undefined,
): Promise<ProfilePageCustomization | undefined> {
    if (!customization) return customization;
    const blocks = customization.customBlocks ?? [];
    if (blocks.length === 0) return customization;

    const nextBlocks = await Promise.all(
        blocks.map(async (block) => {
            let next = block;
            if (block.imageStoragePath) {
                const imageUrl = await refreshProfileMediaUrl(block.imageStoragePath, block.imageUrl);
                if (imageUrl && imageUrl !== block.imageUrl) {
                    next = { ...next, imageUrl };
                } else if (imageUrl && !block.imageUrl) {
                    next = { ...next, imageUrl };
                }
            }
            const canvas = next.canvasStyle;
            if (canvas?.backgroundStoragePath) {
                const backgroundImage = await refreshProfileMediaUrl(
                    canvas.backgroundStoragePath,
                    canvas.backgroundImage,
                );
                if (backgroundImage && backgroundImage !== canvas.backgroundImage) {
                    next = {
                        ...next,
                        canvasStyle: { ...canvas, backgroundImage },
                    };
                } else if (backgroundImage && !canvas.backgroundImage) {
                    next = {
                        ...next,
                        canvasStyle: { ...canvas, backgroundImage },
                    };
                }
            }
            return next;
        }),
    );

    return { ...customization, customBlocks: nextBlocks };
}

export function profileMediaErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        if (err.message === 'image too large') return 'الصورة كبيرة جداً — اختر صورة أصغر';
        if (err.message === 'نوع الملف غير مدعوم') return err.message;
    }
    return 'فشل رفع الصورة — تحقق من الاتصال أو جرّب صورة أصغر';
}
