import type { LawyerProfileData } from '@/app/services/profile/profileTypes';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import {
    deleteProfileWarmCacheRaw,
    getProfileWarmCacheRaw,
    hasProfileWarmCacheRaw,
    setProfileWarmCacheRaw,
} from '@/app/services/profile/profileWarmCacheStore';

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
    const raw = getProfileWarmCacheRaw(uid);
    if (!raw) return undefined;
    return resolveWarmCacheEntry(uid, raw, options);
}

export function setProfileWarmCache(userId: string, data: LawyerProfileData): void {
    setProfileWarmCacheRaw(userId, sanitizeLawyerProfile(data));
}

export function invalidateProfileWarmCache(userId?: string): void {
    deleteProfileWarmCacheRaw(userId);
}

export function hasProfileWarmCache(userId: string): boolean {
    return hasProfileWarmCacheRaw(userId);
}
