import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';

const cache = new Map<string, LawyerProfileData>();
const inflight = new Map<string, Promise<LawyerProfileData>>();

export type ProfileWarmCachePeekOptions = {
    viewerId?: string | null;
};

function resolveWarmCacheEntry(
    userId: string,
    raw: LawyerProfileData,
    options?: ProfileWarmCachePeekOptions,
): LawyerProfileData {
    const viewer = options?.viewerId?.trim();
    if (viewer && viewer !== userId.trim()) {
        return redactProfileForVisitorView(raw);
    }
    return raw;
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

/** تحميل مسبق لبيانات الملف المهني — hover/تشغيل اللوحة */
export function warmProfileDataCache(userId?: string | null): Promise<LawyerProfileData | null> {
    const uid = userId?.trim();
    if (!uid || typeof window === 'undefined') return Promise.resolve(null);
    if (cache.has(uid)) return Promise.resolve(cache.get(uid)!);

    const pending = inflight.get(uid);
    if (pending) return pending.catch(() => null);

    const run = import('@/app/services/cloud/lawyerProfileCloud')
        .then((m) => m.ProfileDB.getProfile(uid))
        .then((data) => {
            setProfileWarmCache(uid, data);
            return data;
        })
        .finally(() => {
            inflight.delete(uid);
        });

    inflight.set(uid, run);
    return run.catch(() => null);
}

export function prefetchProfileData(userId?: string | null): void {
    void warmProfileDataCache(userId).catch(() => undefined);
}
