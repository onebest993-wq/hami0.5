/**
 * تسخين مسار الدعاوى مباشرة عبر loaders — بلا hop عبر lazyComponents.
 * مهم: لا تفعّل جسر الجزائي على أول chrome — يسرق criminal-runtime (~251KB).
 * الافتراضي: ثانوي OFF وتأخير ≥2s إن طُلب — لا NewCase/SmartFile/جزائي على كل فتح.
 */
import {
    prefetchLawsuitArchiveContent,
    prefetchLawsuitArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import { startLawsuitFilesEagerHydrate } from '@/app/runtime/lawsuitFilesEagerHydrate';
import { prefetchArchivePortalForWorkspace } from '@/app/runtime/archivePortalBoot';
import { prefetchLawyerNewCaseModule } from '@/app/runtime/lawyerNewCaseLoader';
import { prefetchLawsuitsOverlayEntry } from '@/app/runtime/lawsuitsOverlayEntryLoader';
import { prefetchLawsuitsWorkspaceHost } from '@/app/components/lawyer/dashboard/lawsuitsWorkspaceHostLazy';
import {
    LAWSUITS_PRIME_HOST_EVENT,
    LAWSUITS_STORAGE_WARMED_EVENT,
} from '@/app/runtime/lawsuitWorkspaceEvents';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLawsuitArchivePerfMarks,
    markLawsuitArchivePerf,
    reportLawsuitArchivePerf,
} from '@/app/services/alerts/lawsuitArchivePerfMetrics';

export type LawsuitWorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
};

/**
 * تسخين فوري لمخزن الدعاوى (ArchivePortal + Host)، ثم ثانوي اختياري (مستعجل / إضبارة / جسر جزائي).
 */
export function warmLawsuitWorkspace(options?: LawsuitWorkspaceWarmOptions): void {
    if (typeof window === 'undefined') return;

    const includeSecondary = options?.includeSecondary === true;
    const secondaryDelayMs = Math.max(0, options?.secondaryDelayMs ?? 2_000);

    clearLawsuitArchivePerfMarks();
    markLawsuitArchivePerf('open-request');

    /* مقاطع الدعاوى مشفّرة دائماً — فكّ مقاطع الدعوى فقط (لا PROTECTED كلها) */
    startLawsuitFilesEagerHydrate();
    void SecureStoreService.ensureLawsuitKeysReady()
        .then(() => {
            if (typeof window === 'undefined') return;
            window.dispatchEvent(new CustomEvent(LAWSUITS_STORAGE_WARMED_EVENT));
            reportLawsuitArchivePerf();
        })
        .catch(() => undefined);

    window.dispatchEvent(new CustomEvent(LAWSUITS_PRIME_HOST_EVENT));

    prefetchLawsuitArchiveHubModule();
    prefetchLawsuitArchiveContent();
    prefetchArchivePortalForWorkspace('lawsuit');
    prefetchLawsuitsOverlayEntry();
    prefetchLawsuitsWorkspaceHost();

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
