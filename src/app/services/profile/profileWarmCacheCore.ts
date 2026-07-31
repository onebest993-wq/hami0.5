import type { LawyerProfileData } from '@/app/services/profile/profileTypes';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';

const cache = new Map<string, LawyerProfileData>();

export type ProfileWarmCachePeekOptions = {
    viewerId?: string | null;
};

function resolveWarmCacheEntry(
    userId: string,
    raw: LawyerProfileData,
    options?: ProfileWarmCachePeekOptions,
): LawyerProfileData {
    /* بلا options = مسار المالك الداخلي؛ مع options: لا تفتح الحمولة إلا لمشاهد = المالك */
    if (!options) return raw;
    const viewer = options.viewerId?.trim();
    if (viewer && viewer === userId.trim()) return raw;
    return redactProfileForVisitorView(raw);
}

export function peekProfileWarmCache(
    userId: string,
    options?: ProfileWarmCachePeekOptions,
): LawyerProfileData | undefined {
    const uid = userId.trim();
    if (!uid) return undefined;
    const raw = cache.get(uid);
    if (!raw) return undefined;
    return resolveWarmCacheEntry(uid, raw, options);
}

export function setProfileWarmCache(userId: string, data: LawyerProfileData): void {
    const uid = userId.trim();
    if (uid) cache.set(uid, sanitizeLawyerProfile(data));
}

export function invalidateProfileWarmCache(userId?: string): void {
    if (userId?.trim()) cache.delete(userId.trim());
    else cache.clear();
}

export function hasProfileWarmCache(userId: string): boolean {
    return cache.has(userId.trim());
}
