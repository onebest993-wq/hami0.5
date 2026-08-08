/**
 * مسار تسخين موحّد للملف المهني — نقطة دخول واحدة بدل prefetch متفرق.
 *
 * boot   → shell chunks فقط (بعد الإقلاع)
 * hover  → shell + data + studio prefetch خفيف
 * open   → data sync + shell hydrate إجباري + studio prefetch
 */

import { prefetchProfileCanvasFxCore } from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { hydrateProfileShellForInstantOpenWithData } from '@/app/runtime/profileBootHydrator';
import { prefetchProfileTabModule } from '@/app/runtime/profileTabModuleLoader';
import { prefetchRoyalLawyerProfileChunk } from '@/app/runtime/royalLawyerProfileLoader';
import { prefetchProfileSettingsSheetModule } from '@/app/runtime/profileSettingsSheetLoader';
import { prefetchProfileStudioChunk } from '@/app/runtime/profileSettingsStudioTabsLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    hydrateProfileWarmCachePeekSync,
    prefetchProfileData,
} from '@/app/services/profile/profileWarmCache';

export type ProfilePrimeTier = 'boot' | 'hover' | 'open';

function shouldAggressiveProfileWarm(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        if (s.performance.prefetchScreens === false) return false;
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        /* ignore */
    }
    return true;
}

export function primeProfileStudio(): void {
    prefetchProfileSettingsSheetModule();
    prefetchProfileStudioChunk('appearance');
}

function primeProfileDataSync(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid) return;
    hydrateProfileWarmCachePeekSync(uid);
}

function primeProfileDataAsync(userId?: string | null): void {
    const uid = userId?.trim();
    if (!uid || typeof document === 'undefined' || document.hidden) return;
    prefetchProfileData(uid);
}

function primeProfileShellChunks(): void {
    prefetchProfileTabModule();
    prefetchRoyalLawyerProfileChunk();
}

function scheduleDeferredFx(): void {
    if (!shouldAggressiveProfileWarm()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    prefetchProfileCanvasFxCore();
}

/** التسلسل الرسمي للتسخين — لا تُضاف prefetch خارج هذه الوحدة */
export function primeProfileShell(tier: ProfilePrimeTier, userId?: string | null): void {
    switch (tier) {
        case 'boot':
            primeProfileShellChunks();
            return;
        case 'hover':
            primeProfileDataSync(userId);
            primeProfileShellChunks();
            primeProfileStudio();
            primeProfileDataAsync(userId);
            if (shouldAggressiveProfileWarm()) prefetchProfileCanvasFxCore();
            return;
        case 'open':
            primeProfileDataSync(userId);
            primeProfileShellChunks();
            primeProfileStudio();
            void hydrateProfileShellForInstantOpenWithData(userId, true).catch(() => undefined);
            primeProfileDataAsync(userId);
            queueMicrotask(scheduleDeferredFx);
            return;
        default: {
            const _exhaustive: never = tier;
            return _exhaustive;
        }
    }
}

export function primeProfileForBoot(): void {
    primeProfileShell('boot');
    void import('@/app/runtime/profileHubLoader')
        .then((m) => m.loadProfileHubModule())
        .catch(() => undefined);
}

export function primeProfileForHover(userId?: string | null): void {
    primeProfileShell('hover', userId);
}

export function primeProfileForOpen(userId?: string | null): void {
    primeProfileShell('open', userId);
}
