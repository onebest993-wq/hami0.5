/**
 * تسخين مسار الدعاوى مباشرة عبر loaders — بلا hop عبر lazyComponents.
 * مهم: لا تفعّل جسر الجزائي على أول chrome — يسرق criminal-runtime (~251KB).
 */
import {
    prefetchLawsuitArchiveContent,
    prefetchLawsuitArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import { prefetchArchivePortalForWorkspace } from '@/app/runtime/archivePortalBoot';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';

/** hover/warm — يركّب Host مخفياً قبل النقر (مثل settings) */
export const LAWSUITS_PRIME_HOST_EVENT = 'hami:lawsuits-prime-host';

export type LawsuitWorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
};

/**
 * تسخين فوري لمخزن الدعاوى (ArchivePortal + Host)، ثم ثانوي (مستعجل / إضبارة / جسر جزائي).
 */
export function warmLawsuitWorkspace(options?: LawsuitWorkspaceWarmOptions): void {
    if (typeof window === 'undefined') return;

    const includeSecondary = options?.includeSecondary !== false;
    const secondaryDelayMs = Math.max(0, options?.secondaryDelayMs ?? 0);

    window.dispatchEvent(new CustomEvent(LAWSUITS_PRIME_HOST_EVENT));

    prefetchLawsuitArchiveHubModule();
    prefetchLawsuitArchiveContent();
    prefetchArchivePortalForWorkspace('lawsuit');
    void import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost').catch(() => undefined);
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry',
    ).catch(() => undefined);

    if (!includeSecondary) return;

    const scheduleSecondaryWarm = () => {
        prefetchLawyerNewCaseModule();
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => m.prefetchUrgentOrdersViewModule())
            .catch(() => undefined);
        void import('@/app/components/lawyer/dashboard/smartFileModalPortalLazy')
            .then((m) => m.prefetchSmartFileModalPortal())
            .catch(() => undefined);
        void import('@/app/runtime/smartFileModalLoader')
            .then((m) => {
                m.prefetchSmartFileModalPhased();
            })
            .catch(() => undefined);
        void import('@/app/slices/criminal/bridgeEvent')
            .then((m) => m.requestCriminalDashboardBridgeActivate())
            .catch(() => undefined);
    };

    if (secondaryDelayMs <= 0) {
        scheduleSecondaryWarm();
        return;
    }

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(scheduleSecondaryWarm, { timeout: Math.max(200, secondaryDelayMs) });
    } else {
        window.setTimeout(scheduleSecondaryWarm, secondaryDelayMs);
    }
}
