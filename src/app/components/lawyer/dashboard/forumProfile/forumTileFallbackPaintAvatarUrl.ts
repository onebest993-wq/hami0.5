import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';

/** الهيكل الاحتياطي لا يفكّ data: الثقيل — الكشف لا ينتظر <img> لن يظهر */
export function forumTileFallbackPaintAvatarUrl(raw: string): string {
    const safe = sanitizeProfileMediaUrl(raw) ?? '';
    if (!safe || safe.startsWith('data:')) return '';
    return safe;
}
