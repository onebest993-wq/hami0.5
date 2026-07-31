type RoyalLawyerProfileModule = typeof import('@/app/components/lawyer/RoyalLawyerProfile');

import {
    markRoyalLawyerProfileModuleResolved,
} from '@/app/runtime/royalLawyerProfileModuleState';
import { warmProfileDataCache } from '@/app/services/profile/profileWarmCache';

export {
    isRoyalLawyerProfileModuleResolved,
    resetRoyalLawyerProfileModuleStateForTests,
} from '@/app/runtime/royalLawyerProfileModuleState';

let profileModulePromise: Promise<RoyalLawyerProfileModule> | null = null;

function ensureProfileModulePromise(): Promise<RoyalLawyerProfileModule> {
    if (!profileModulePromise) {
        profileModulePromise = import('@/app/components/lawyer/RoyalLawyerProfile').then((mod) => {
            markRoyalLawyerProfileModuleResolved();
            return mod;
        });
    }
    return profileModulePromise;
}

function prefetchProfileDataCache(userId?: string | null): void {
    if (typeof window === 'undefined' || !userId?.trim()) return;
    void warmProfileDataCache(userId);
}

/** تحميل مسبق لـ chunk الملف فقط — خفيف للإقلاع والهيدر. */
export function prefetchRoyalLawyerProfileChunk(): void {
    if (typeof window === 'undefined') return;
    void ensureProfileModulePromise();
}

/** chunk + cache البيانات — للـ hover والتسخين بعد اللوحة. */
export function prefetchRoyalLawyerProfile(userId?: string | null): void {
    prefetchRoyalLawyerProfileChunk();
    prefetchProfileDataCache(userId);
}

/** للفتح من الهيدر: ينتظر chunk الواجهة فقط — بلا حجب بجلب البيانات. */
export function loadRoyalLawyerProfileModule(
    _userId?: string | null,
): Promise<RoyalLawyerProfileModule> {
    prefetchRoyalLawyerProfileChunk();
    return ensureProfileModulePromise();
}

/** تحميل كامل (واجهة + بيانات) — للتسخين بعد جاهزية اللوحة. */
export function loadRoyalLawyerProfileWithData(
    userId?: string | null,
): Promise<RoyalLawyerProfileModule> {
    prefetchRoyalLawyerProfile(userId);
    const dataWarm = warmProfileDataCache(userId);
    return Promise.all([ensureProfileModulePromise(), dataWarm]).then(([mod]) => mod);
}
