import {
    PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE,
    PROFILE_AVATAR_INLINE_HEAVY_CHARS,
    warmProfileAvatarDisplaySrc,
} from '@/app/services/profile/resolveProfileAvatarDisplaySrc';

const primed = new Set<string>();

/**
 * يفكّ روابط الشبكة في وقت خامل.
 * data: الثقيل يُسخَّن كمصغّر بلاط المنزل — لا Image() بالحجم الكامل على خيط الإقلاع.
 */
export function primeProfileAvatarDecode(src: string | undefined): void {
    if (typeof window === 'undefined') return;
    const url = src?.trim() ?? '';
    if (!url || primed.has(url)) return;
    primed.add(url);

    if (url.startsWith('data:') && url.length > PROFILE_AVATAR_INLINE_HEAVY_CHARS) {
        warmProfileAvatarDisplaySrc(url, PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE);
        return;
    }

    const start = () => {
        try {
            const img = new Image();
            img.decoding = 'async';
            img.src = url;
            void img.decode?.().catch(() => undefined);
        } catch {
            primed.delete(url);
        }
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(start, { timeout: 1_200 });
        return;
    }
    window.setTimeout(start, 0);
}

export function resetPrimeProfileAvatarDecodeForTests(): void {
    primed.clear();
}
