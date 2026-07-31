/**
 * تسخين مسار التنفيذ مباشرة عبر loaders — بلا hop عبر lazyComponents.
 */
import {
    prefetchExecutionArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import { prefetchExecutionCreationSurface } from '@/app/runtime/executionCreationLoader';
import {
    ensureExecutionDossierFirstPaintReady,
    prefetchExecutionDashboardByMode,
    primeExecutionDossierSurface,
    type ExecutionDashboardPrefetchMode,
} from '@/app/runtime/executionDashboardLoader';
import { prefetchArchivePortalForWorkspace } from '@/app/runtime/archivePortalBoot';
import {
    markExecutionDossierWarmed,
    markExecutionWorkspaceWarmed,
} from '@/app/services/executionWarmCoordinator';

export type ExecutionWorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
    /** معرّف الجلسة لتسخين فهرس الإضابير مسبقاً */
    userId?: string | null;
};

/**
 * تسخين فوري لمخزن التنفيذ، ثم (secondary) الإضبارة + نموذج الإنشاء.
 * الإنشاء لا يُسخَّن على مسار فتح الأرشيف الأساسي — يُنافس bandwidth أول paint.
 * secondaryDelayMs الافتراضي 0 — أي تأخير يُفقد سباق أول نقرة على الإضبارة.
 */
export function warmExecutionWorkspace(options?: ExecutionWorkspaceWarmOptions): void {
    if (typeof window === 'undefined') return;

    markExecutionWorkspaceWarmed();

    const includeSecondary = options?.includeSecondary !== false;
    const secondaryDelayMs = Math.max(0, options?.secondaryDelayMs ?? 0);

    prefetchExecutionArchiveHubModule();
    prefetchArchivePortalForWorkspace('execution');

    void import('@/app/services/SecureStoreService')
        .then((m) => m.default.ensurePersistedReady())
        .catch(() => undefined);

    if (options?.userId !== undefined) {
        void import('@/app/runtime/executionFilesEagerHydrate')
            .then((m) => m.startExecutionFilesEagerHydrate(options.userId))
            .catch(() => undefined);
    }

    void import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry').catch(
        () => undefined,
    );

    if (!includeSecondary) return;

    const scheduleSecondaryWarm = () => {
        markExecutionDossierWarmed();
        // جذري: أكمل سلسلة أول paint الآن بينما المستخدم يتصفّح القائمة
        primeExecutionDossierSurface();
        void ensureExecutionDossierFirstPaintReady();
        // الإنشاء بعد/مع الإضبارة — لا يسرق شبكة فتح المخزن
        prefetchExecutionCreationSurface();
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

export function warmExecutionDossier(mode: ExecutionDashboardPrefetchMode = 'intent'): void {
    if (typeof window === 'undefined') return;
    markExecutionDossierWarmed();
    prefetchExecutionDashboardByMode(mode);
    if (mode === 'urgent' || mode === 'intent') {
        void ensureExecutionDossierFirstPaintReady();
    }
}

/**
 * تسخين عاجل ثم انتظار جاهزية أول paint.
 * يُستدعى قبل setActiveFile مع إبقاء الأرشيف مفتوحاً حتى لا تومض الشاشة الرئيسية.
 */
export function warmExecutionDossierUntilReady(
    mode: ExecutionDashboardPrefetchMode = 'urgent',
): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    markExecutionDossierWarmed();
    prefetchExecutionDashboardByMode(mode);
    return ensureExecutionDossierFirstPaintReady();
}
