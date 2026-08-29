import { profileMediaIdentity } from '@/app/services/profile/profileMediaIdentity';

/** فوق هذا الطول يُفضَّل تصغير data: قبل وضعه في <img> */
export const PROFILE_AVATAR_INLINE_HEAVY_CHARS = 12_000;

/** بلاط المنتدى (~90px @2–3×) */
export const PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE = 256;

/** افتراضي للصور الشخصية المضغوطة للعرض */
export const PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT = 384;

const JPEG_QUALITY = 0.88;
const MAX_CACHE = 24;

type CacheEntry = {
    edge: number;
    url: string;
    blobUrl: boolean;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(src: string, maxEdge: number): string {
    return `${profileMediaIdentity(src)}@${maxEdge}`;
}

function remember(key: string, entry: CacheEntry): void {
    if (cache.size >= MAX_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest) {
            const prev = cache.get(oldest);
            if (prev?.blobUrl) {
                try {
                    URL.revokeObjectURL(prev.url);
                } catch {
                    /* ignore */
                }
            }
            cache.delete(oldest);
        }
    }
    cache.set(key, entry);
}

export function peekProfileAvatarDisplaySrc(
    src: string,
    maxEdge: number = PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT,
): string | null {
    const url = src.trim();
    if (!url || maxEdge <= 0 || !shouldDownscaleProfileAvatarSrc(url)) return url || null;
    return cache.get(cacheKey(url, maxEdge))?.url ?? null;
}

export function shouldDownscaleProfileAvatarSrc(src: string): boolean {
    const url = src.trim();
    return url.startsWith('data:') && url.length > PROFILE_AVATAR_INLINE_HEAVY_CHARS;
}

async function downscaleDataUrl(src: string, maxEdge: number): Promise<string> {
    const response = await fetch(src);
    const blob = await response.blob();

    let bitmap: ImageBitmap | null = null;
    let sourceW = 0;
    let sourceH = 0;
    let draw: ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | null = null;

    if (typeof createImageBitmap === 'function') {
        try {
            bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
            sourceW = bitmap.width;
            sourceH = bitmap.height;
            const bmp = bitmap;
            draw = (ctx, w, h) => {
                ctx.drawImage(bmp, 0, 0, w, h);
            };
        } catch {
            bitmap = null;
        }
    }

    if (!draw) {
        const objectUrl = URL.createObjectURL(blob);
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('avatar decode failed'));
                img.src = objectUrl;
            });
            sourceW = image.naturalWidth || image.width;
            sourceH = image.naturalHeight || image.height;
            draw = (ctx, w, h) => {
                ctx.drawImage(image, 0, 0, w, h);
            };
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    if (!sourceW || !sourceH || !draw) {
        bitmap?.close();
        return src;
    }

    const ratio = Math.min(1, maxEdge / Math.max(sourceW, sourceH));
    if (ratio >= 1) {
        bitmap?.close();
        return URL.createObjectURL(blob);
    }
    const w = Math.max(1, Math.round(sourceW * ratio));
    const h = Math.max(1, Math.round(sourceH * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap?.close();
        return src;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    draw(ctx, w, h);
    bitmap?.close();

    const outBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
    });
    if (!outBlob) return src;
    return URL.createObjectURL(outBlob);
}

/**
 * يعيد مصدراً خفيفاً للعرض (blob: مصغّر) لـ data:JPEG الثقيل.
 * الروابط الشبكية والصغيرة تُمرَّر كما هي.
 */
export async function resolveProfileAvatarDisplaySrc(
    src: string,
    maxEdge: number = PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT,
): Promise<string> {
    const url = src.trim();
    if (!url || maxEdge <= 0 || !shouldDownscaleProfileAvatarSrc(url)) return url;

    const key = cacheKey(url, maxEdge);
    const hit = cache.get(key);
    if (hit) return hit.url;

    const pending = inflight.get(key);
    if (pending) return pending;

    const work = downscaleDataUrl(url, maxEdge)
        .then((resolved) => {
            const blobUrl = resolved.startsWith('blob:');
            remember(key, { edge: maxEdge, url: resolved, blobUrl });
            return resolved;
        })
        .catch(() => url)
        .finally(() => {
            inflight.delete(key);
        });

    inflight.set(key, work);
    return work;
}

/** تسخين كسول لكاش العرض — لا يفكّ data: الكامل في Image() على خيط الإقلاع */
export function warmProfileAvatarDisplaySrc(
    src: string | undefined,
    maxEdge: number = PROFILE_AVATAR_DISPLAY_MAX_EDGE_DEFAULT,
): void {
    if (typeof window === 'undefined') return;
    const url = src?.trim() ?? '';
    if (!shouldDownscaleProfileAvatarSrc(url)) return;
    const key = cacheKey(url, maxEdge);
    if (cache.has(key) || inflight.has(key)) return;

    const start = () => {
        void resolveProfileAvatarDisplaySrc(url, maxEdge);
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(start, { timeout: 1_800 });
        return;
    }
    window.setTimeout(start, 0);
}

export function resetProfileAvatarDisplayCacheForTests(): void {
    for (const entry of cache.values()) {
        if (entry.blobUrl) {
            try {
                URL.revokeObjectURL(entry.url);
            } catch {
                /* ignore */
            }
        }
    }
    cache.clear();
    inflight.clear();
}
