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

let lawsuitWorkspaceWarmOpenCounter = 0;
let _lastActiveWorkspaceWarmId = 0;
const lawsuitWorkspaceWarmSessionIdRef = { current: 0 };
const activeLawsuitWorkspaceWarmSessionIdRef = { current: 0 };

export type LawsuitWorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
};

function markLawsuitWorkspaceWarmSessionBoot(): void {
    lawsuitWorkspaceWarmOpenCounter += 1;
    _lastActiveWorkspaceWarmId = lawsuitWorkspaceWarmOpenCounter;
    lawsuitWorkspaceWarmSessionIdRef.current = lawsuitWorkspaceWarmOpenCounter;
    activeLawsuitWorkspaceWarmSessionIdRef.current = lawsuitWorkspaceWarmOpenCounter;
}

export function resetLawsuitWorkspaceWarmSessionForTests(): void {
    lawsuitWorkspaceWarmOpenCounter = 0;
    _lastActiveWorkspaceWarmId = 0;
    lawsuitWorkspaceWarmSessionIdRef.current = 0;
    activeLawsuitWorkspaceWarmSessionIdRef.current = 0;
}

/* `import.meta.hot` مُنمَّط أصلاً عبر "vite/client" في tsconfig.app.json،
   فالتوجيهان اللذان كانا هنا يقمعان لا شيء — وقامعٌ فارغ اليوم يبتلع خطأً
   حقيقياً غداً. أُزيلا، و tsc يعطي صفر أخطاء لهذا الملف. */
if (typeof import.meta !== 'undefined' && import.meta.hot && typeof import.meta.hot.dispose === 'function') {
    import.meta.hot.dispose(() => {
        void import('@/app/services/litigation/tearDownLitigationFloatingState').then((m) =>
            m.tearDownLitigationFloatingState({
                targetSurface: 'litigation-shell',
                reason: 'hot-dispose',
            }),
        );
        lawsuitWorkspaceWarmOpenCounter = 0;
        _lastActiveWorkspaceWarmId = 0;
        lawsuitWorkspaceWarmSessionIdRef.current = 0;
        activeLawsuitWorkspaceWarmSessionIdRef.current = 0;
    });
}

/**
 * تسخين فوري لمخزن الدعاوى (ArchivePortal + Host)، ثم ثانوي اختياري (مستعجل / إضبارة / جسر جزائي).
 */
export function warmLawsuitWorkspace(options?: LawsuitWorkspaceWarmOptions): void {
    if (typeof window === 'undefined') return;
    markLawsuitWorkspaceWarmSessionBoot();

    const includeSecondary = options?.includeSecondary === true;
    const secondaryDelayMs = Math.max(0, options?.secondaryDelayMs ?? 2_000);

    if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
    clearLawsuitArchivePerfMarks();
    markLawsuitArchivePerf('open-request');

    /* مقاطع الدعاوى مشفّرة دائماً — فكّ مقاطع الدعوى فقط (لا PROTECTED كلها) */
    startLawsuitFilesEagerHydrate();
    void SecureStoreService.ensureLawsuitKeysReady()
        .then(() => {
            if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
            if (typeof window === 'undefined') return;
            window.dispatchEvent(new CustomEvent(LAWSUITS_STORAGE_WARMED_EVENT));
            reportLawsuitArchivePerf();
        })
        .catch(() => undefined);

    if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
    window.dispatchEvent(new CustomEvent(LAWSUITS_PRIME_HOST_EVENT));

    prefetchLawsuitArchiveHubModule();
    prefetchLawsuitArchiveContent();
    prefetchArchivePortalForWorkspace('lawsuit');
    prefetchLawsuitsOverlayEntry();
    prefetchLawsuitsWorkspaceHost();

    if (!includeSecondary) return;

    const scheduleSecondaryWarm = () => {
        if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
        prefetchLawyerNewCaseModule();
        void import('@/app/runtime/urgentOrdersViewLoader')
            .then((m) => {
                if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
                m.prefetchUrgentOrdersViewModule();
            })
            .catch(() => undefined);
        void import('@/app/components/lawyer/dashboard/smartFileModalPortalLazy')
            .then((m) => {
                if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
                m.prefetchSmartFileModalPortal();
            })
            .catch(() => undefined);
        void import('@/app/runtime/smartFileModalLoader')
            .then((m) => {
                if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
                m.prefetchSmartFileModalPhased();
            })
            .catch(() => undefined);
        void import('@/app/slices/criminal/bridgeEvent')
            .then((m) => {
                if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
                m.requestCriminalDashboardBridgeActivate();
            })
            .catch(() => undefined);
    };

    if (secondaryDelayMs <= 0) {
        if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
        scheduleSecondaryWarm();
        return;
    }

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
            if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
            scheduleSecondaryWarm();
        }, { timeout: Math.max(200, secondaryDelayMs) });
    } else {
        window.setTimeout(() => {
            if (lawsuitWorkspaceWarmSessionIdRef.current !== activeLawsuitWorkspaceWarmSessionIdRef.current) return;
            scheduleSecondaryWarm();
        }, secondaryDelayMs);
    }
}
