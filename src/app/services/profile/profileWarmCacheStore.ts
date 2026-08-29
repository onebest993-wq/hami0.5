import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

const cache = new Map<string, LawyerProfileData>();
const listeners = new Set<(userId: string) => void>();

function notifyWarmCache(userId: string): void {
    listeners.forEach((fn) => {
        try {
            fn(userId);
        } catch {
            /* ignore */
        }
    });
}

/** يُخطر غطاء الفتح عندما يمتلئ الكاش بعد أول إطار */
export function subscribeProfileWarmCache(listener: (userId: string) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** قراءة خام للكاش — بلا sanitizer/visitor. الهيدر يحتاج الصورة/الاسم فقط. */
export function getProfileWarmCacheRaw(userId: string): LawyerProfileData | undefined {
    const uid = userId.trim();
    if (!uid) return undefined;
    return cache.get(uid);
}

export function setProfileWarmCacheRaw(userId: string, data: LawyerProfileData): void {
    const uid = userId.trim();
    if (!uid) return;
    cache.set(uid, data);
    notifyWarmCache(uid);
}

export function deleteProfileWarmCacheRaw(userId?: string): void {
    if (userId?.trim()) cache.delete(userId.trim());
    else cache.clear();
}

export function hasProfileWarmCacheRaw(userId: string): boolean {
    const uid = userId.trim();
    return Boolean(uid) && cache.has(uid);
}
