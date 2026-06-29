import {
    prefetchRoyalLawyerProfile,
    prefetchRoyalLawyerProfileChunk,
} from '@/app/runtime/royalLawyerProfileLoader';
import { prefetchProfileData } from '@/app/services/profile/profileWarmCache';
import {
    prefetchProfileCanvasFxCore,
    prefetchProfileCanvasStudioFx,
} from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { prefetchLawyerDashboardProfileTabShell } from '@/app/runtime/lawyerDashboardProfileTabLoader';

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

/** عند hover/لمس الملف المهني: chunk + بيانات + FX أساسي + استوديو */
export function warmProfileOnHover(userId?: string | null): void {
    prefetchLawyerDashboardProfileTabShell();
    prefetchRoyalLawyerProfile(userId);
    prefetchProfileSettingsSheet();
    prefetchProfileCanvasFxCore();
    if (shouldAggressiveProfileWarm()) {
        prefetchProfileCanvasStudioFx();
    }
}

/**
 * عند فتح التبويب: shell + chunk فوراً + بيانات الشبكة فوراً (بلا انتظار microtask).
 * FX/studio يُكمَّل بعد paint — بلا حجب flushSync.
 */
export function warmProfileOnOpen(userId?: string | null): void {
    prefetchLawyerDashboardProfileTabShell();
    prefetchRoyalLawyerProfileChunk();
    if (userId?.trim() && typeof document !== 'undefined' && !document.hidden) {
        prefetchProfileData(userId);
    }
    queueMicrotask(() => {
        prefetchProfileSettingsSheet();
        prefetchProfileCanvasFxCore();
        if (!shouldAggressiveProfileWarm()) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        prefetchRoyalLawyerProfile(userId);
        prefetchProfileCanvasStudioFx();
    });
}
