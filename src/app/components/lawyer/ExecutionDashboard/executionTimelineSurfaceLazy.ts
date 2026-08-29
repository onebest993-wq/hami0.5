import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

/** سطح السجل الزمني — instance واحد لأول viewport ولنوافذ السجل. */
export const LazyPremiumTimelineAuditLog = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/PremiumTimelineAuditLog').then((m) => ({
        default: m.PremiumTimelineAuditLog,
    })),
);

export const LazySmartTimelineRadar = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/SmartTimelineRadar').then((m) => ({
        default: m.SmartTimelineRadar,
    })),
);

export function prefetchExecutionTimelineSurface(): Promise<void> {
    return Promise.all([
        LazyPremiumTimelineAuditLog.preload(),
        LazySmartTimelineRadar.preload(),
    ]).then(() => undefined);
}
