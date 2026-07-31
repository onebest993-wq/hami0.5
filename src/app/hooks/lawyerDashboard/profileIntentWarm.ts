import { prefetchProfileHubModule } from '@/app/runtime/profileHubLoader';
import { hydrateProfileShellForInstantOpenWithData } from '@/app/runtime/profileBootHydrator';
import { prefetchProfileData } from '@/app/services/profile/profileWarmCache';
import { prefetchProfileCanvasFxCore } from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { prefetchProfileSettingsSheetModule } from '@/app/runtime/profileSettingsSheetLoader';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
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

/** عند hover/لمس الملف المهني: chunk + بيانات + FX أساسي (بلا استوديو ثقيل) */
export function warmProfileOnHover(userId?: string | null): void {
    prefetchLawyerDashboardProfileTabShell();
    prefetchProfileHubModule();
    prefetchProfileSettingsSheetModule();
    if (shouldAggressiveProfileWarm()) {
        prefetchProfileCanvasFxCore();
    }
    if (userId?.trim()) {
        prefetchProfileData(userId);
    }
}

/**
 * عند فتح التبويب: shell + chunk فوراً + بيانات الشبكة فوراً (بلا انتظار microtask).
 * FX أساسي بعد paint — بلا prefetch استوديو ثقيل.
 */
export function warmProfileOnOpen(userId?: string | null): void {
    prefetchLawyerDashboardProfileTabShell();
    void hydrateProfileShellForInstantOpenWithData(userId, true);
    if (userId?.trim() && typeof document !== 'undefined' && !document.hidden) {
        prefetchProfileData(userId);
    }
    queueMicrotask(() => {
        prefetchProfileSettingsSheetModule();
        if (!shouldAggressiveProfileWarm()) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        prefetchProfileCanvasFxCore();
    });
}
