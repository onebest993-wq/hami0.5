import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

/** فصل prefetch عن communityScreenLazyOverlays — لا استيراد ثابت (يمنع modulepreload على الإقلاع). */

export function prefetchCommunityAddQuestionOverlay(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void import('./communityScreenLazyOverlays').then((m) => m.prefetchCommunityAddQuestionOverlay());
}

export function prefetchCommunitySearchOverlay(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void import('./communityScreenLazyOverlays').then((m) => m.prefetchCommunitySearchOverlay());
}

export function scheduleCommunityProfileOverlayPrefetch(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void import('./communityScreenLazyOverlays').then((m) => m.scheduleCommunityProfileOverlayPrefetch());
}

export function prefetchCommunityHeavyOverlays(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void import('./communityScreenLazyOverlays').then((m) => m.prefetchCommunityHeavyOverlays());
}
