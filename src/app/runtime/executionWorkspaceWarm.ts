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

let executionWorkspaceWarmOpenCounter = 0;
let lastActiveWarmWorkspaceExecutionId: string | number = 0;
let executionWorkspaceWarmSessionId = 0;
let activeExecutionWorkspaceWarmSessionId = 0;
const executionWorkspaceWarmSessionIdRef = { current: 0 };
const activeExecutionWorkspaceWarmSessionIdRef = { current: 0 };

function _warmWorkspaceSessionBump() {
    executionWorkspaceWarmOpenCounter += 1;
    executionWorkspaceWarmSessionId = executionWorkspaceWarmOpenCounter;
    executionWorkspaceWarmSessionIdRef.current = executionWorkspaceWarmSessionId;
    activeExecutionWorkspaceWarmSessionId = executionWorkspaceWarmSessionId;
    activeExecutionWorkspaceWarmSessionIdRef.current = activeExecutionWorkspaceWarmSessionId;
}

export function cleanupExecutionWorkspaceWarm(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/services/execution/tearDownExecutionFloatingState')
        .then((m) => m.tearDownExecutionFloatingState({
            targetSurface: 'execution-shell',
            reason: 'idle-release',
        }))
        .catch(() => { /* tearDown never throws */ });
    activeExecutionWorkspaceWarmSessionId = 0;
    activeExecutionWorkspaceWarmSessionIdRef.current = 0;
}

export type ExecutionWorkspaceWarmOptions = {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
    /** معرّف الجلسة لتسخين فهرس الإضابير مسبقاً */
    userId?: string | null;
};

/**
 * تسخين فوري لمخزن التنفيذ، ثم (secondary) الإضبارة + نموذج الإنشاء.
 * idle/hover: includeSecondary=false حتى لا ينافس طلاء المنزل.
 * فتح الأيقونة: includeSecondary=true و secondaryDelayMs=0 بينما المستخدم يتصفّح المخزن.
 */
export function warmExecutionWorkspace(options?: ExecutionWorkspaceWarmOptions): void {
    if (typeof window === 'undefined') return;
    _warmWorkspaceSessionBump();
    lastActiveWarmWorkspaceExecutionId = `workspace-${Date.now()}`;

    markExecutionWorkspaceWarmed();

    const includeSecondary = options?.includeSecondary !== false;
    const secondaryDelayMs = Math.max(0, options?.secondaryDelayMs ?? 0);

    prefetchExecutionArchiveHubModule();
    prefetchArchivePortalForWorkspace('execution');

    void import('@/app/services/SecureStoreService')
        .then((m) => {
            if (executionWorkspaceWarmSessionIdRef.current !== activeExecutionWorkspaceWarmSessionIdRef.current) return;
            return m.default.ensureExecutionIndexReady();
        })
        .catch(() => undefined);

    if (options?.userId !== undefined) {
        void import('@/app/runtime/executionFilesEagerHydrate')
            .then((m) => {
                if (executionWorkspaceWarmSessionIdRef.current !== activeExecutionWorkspaceWarmSessionIdRef.current) return;
                return m.startExecutionFilesEagerHydrate(options.userId);
            })
            .catch(() => undefined);
    }

    void import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry').catch(
        () => undefined,
    );

    if (!includeSecondary) return;

    const scheduleSecondaryWarm = () => {
        if (executionWorkspaceWarmSessionIdRef.current !== activeExecutionWorkspaceWarmSessionIdRef.current) return;
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
    _warmWorkspaceSessionBump();
    lastActiveWarmWorkspaceExecutionId = `dossier-${mode}-${Date.now()}`;
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

/*
 * HMR: ما سخّنته هذه الوحدة يُحرَّر عند استبدالها — وإلا بقيت حالةٌ عائمة ومعرّفُ
 * جلسةٍ قديم بعد كل تعديل. وهو الوصل نفسه الذي يفعله `lawsuitWorkspaceWarm`.
 */
if (typeof import.meta !== 'undefined' && import.meta.hot && typeof import.meta.hot.dispose === 'function') {
    import.meta.hot.dispose(() => {
        cleanupExecutionWorkspaceWarm();
    });
}
