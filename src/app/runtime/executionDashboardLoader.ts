/**
 * تحميل مرحلي لإضبارة التنفيذ — chunk رئيسي أولاً، ثم shell عند الخمول أو النية.
 */
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { prefetchDeferredExecutionDossierStyles } from '@/app/runtime/deferredFeatureStyles';
import {
    loadExecutionDashboardModule,
    resetExecutionDashboardModuleCache,
} from '@/app/runtime/executionDashboardModuleLoad';

export { loadExecutionDashboardModule, resetExecutionDashboardModuleCache };

type ExecutionDashboardModule = typeof import('@/app/components/lawyer/ExecutionDashboard.tsx');

export type ExecutionDashboardPrefetchMode = 'deferred' | 'intent' | 'urgent';

export type ExecutionDashboardPrefetchOptions = {
    /**
     * false = تسخين JS بعد كشف اللوحة بلا CSS الأضابير.
     * الافتراضي true لمسار النية/الفتح.
     */
    includeFeatureStyles?: boolean;
};

function prefetchExecutionDossierStylesIfNeeded(includeFeatureStyles?: boolean): void {
    if (includeFeatureStyles === false) return;
    prefetchDeferredExecutionDossierStyles();
}

function prefetchExecutionShellChunks(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell')
        .then((shell) => {
            shell.prefetchExecutionDashboardShell();
        })
        .catch(() => undefined);
}

/**
 * جسم الهاتف + بوابة الإضبارة — مطلوبان لأول paint فعلي للمحتوى.
 * كانا في موجة deep warm الخاملة حتى في وضع urgent، فتنشأ سلسلة انتظار
 * شبكة بعد النقرة (core → body → sections) عند الفتح قبل اكتمال التسخين.
 */
function prefetchExecutionFirstPaintChunks(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyLazy')
        .then((m) => {
            m.prefetchExecutionDashboardPhoneBody();
        })
        .catch(() => undefined);
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell')
        .then((shell) => {
            void shell.preloadExecutionDashboardFirstViewportSections();
        })
        .catch(() => undefined);
    void import('@/app/components/lawyer/dashboard/executionDashboardPortalLazy')
        .then((m) => {
            m.prefetchExecutionDashboardPortal();
        })
        .catch(() => undefined);
    // base scope مطلوب لجسم الهاتف — يبدأ بالتوازي مع PhoneBody قبل النقرة عند intent/urgent
    void import(
        '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesBaseLazy'
    ).catch(() => undefined);
}

/**
 * تسخين عميق (idle) — جسم/سجل حجز/جسور بعد أول paint.
 * overlays والمحضر يُحمَّلان عند نية النافذة/البلاط فقط — لا عبر برميل lazyShell
 * (تقييمه يسحب سجل overlays).
 */
function prefetchExecutionDeepWarmChunks(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyLazy')
        .then((m) => {
            m.prefetchExecutionDashboardPhoneBody();
        })
        .catch(() => undefined);
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell')
        .then((shell) => {
            shell.prefetchUnifiedSeizureLogHost();
            shell.prefetchExecutionDossierDeepSurface();
        })
        .catch(() => undefined);
    void import('@/app/components/lawyer/ExecutionDashboard/executionCoreHandlersPrefetch')
        .then((m) => {
            m.prefetchExecutionCoreHandlers('light');
            m.prefetchExecutionCoreHandlers('dossier-support');
        })
        .catch(() => undefined);
    // مجموعات جسور المعالجات — أول ما يطلبه ChunkHost بعد جاهزية الجسم
    void import(
        '@/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHandlerClusterGroups'
    ).catch(() => undefined);
    // base scope — يُحمَّل بعد أول paint داخل الإضبارة؛ تسخينه هنا يمنع waterfall
    void import(
        '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesBaseLazy'
    ).catch(() => undefined);
    // بوابة الإضبارة نفسها — preload يثبّتها للرسم المباشر بلا تعليق Suspense لحظة النقر
    void import('@/app/components/lawyer/dashboard/executionDashboardPortalLazy')
        .then((m) => {
            m.prefetchExecutionDashboardPortal();
        })
        .catch(() => undefined);
}

/** يبدأ تحميل الـ chunk الرئيسي فقط — بدون منافسة أرشيف التنفيذ */
export function prefetchExecutionDashboardCore(opts?: ExecutionDashboardPrefetchOptions): void {
    if (typeof window === 'undefined') return;
    prefetchExecutionDossierStylesIfNeeded(opts?.includeFeatureStyles);
    void loadExecutionDashboardModule().catch(() => {
        resetExecutionDashboardModuleCache();
    });
}

/**
 * تسخين خفيف لمسار Instant (portal + first-paint) — بدون CSS الأضابير وبدون chunk التنفيذ الكامل.
 * يُستخدم من executionBootHydrator عند الإقلاع.
 */
export function prefetchExecutionDashboardChromeWarm(): void {
    if (typeof window === 'undefined') return;
    prefetchExecutionFirstPaintChunks();
    void import('@/app/components/lawyer/dashboard/ExecutionDashboardBootChrome').catch(() => undefined);
}

/**
 * deferred: بعد فتح قسم التنفيذ — لا يُشغَّل على مسار الفتح المباشر
 * intent: hover على بطاقة/الهَب — chunk رئيسي فوراً، shell عند الخمول
 * urgent: نقرة فتح إضبارة — chunk + shell الحرجة فوراً
 */
export function prefetchExecutionDashboardByMode(
    mode: ExecutionDashboardPrefetchMode,
    opts?: ExecutionDashboardPrefetchOptions,
): void {
    if (typeof window === 'undefined') return;

    switch (mode) {
        case 'deferred':
            scheduleIdleWork(() => {
                prefetchExecutionDashboardCore(opts);
                void loadExecutionDashboardModule()
                    .then(() =>
                        scheduleIdleWork(() => {
                            prefetchExecutionShellChunks();
                            // سلسلة أول paint كاملة مع الـ shell — لا تنتظر موجة deep warm
                            prefetchExecutionFirstPaintChunks();
                            // deep warm رفيع — بلا PCFP/FinancialHub/Law (نية تبويب فقط)
                            scheduleIdleWork(() => {
                                prefetchExecutionDeepWarmChunks();
                            }, 600);
                        }, 500),
                    )
                    .catch(() => undefined);
            }, 800);
            break;
        case 'intent':
            // hover/دخول الأرشيف: النقرة تأتي عادة خلال أقل من ثانية —
            // كل ما يلزم لأول paint (core + shell + body + portal) يُحمَّل فوراً.
            prefetchExecutionDashboardCore(opts);
            prefetchExecutionShellChunks();
            prefetchExecutionFirstPaintChunks();
            scheduleIdleWork(() => {
                prefetchExecutionDeepWarmChunks();
            }, 450);
            break;
        case 'urgent':
            // فتح مباشر: كل سلسلة أول paint بالتوازي فوراً — أي جزء مؤجَّل منها
            // كان يتحول لحلقة waterfall بعد النقرة (chrome يظهر والمحتوى ينتظر).
            prefetchExecutionDashboardCore(opts);
            prefetchExecutionShellChunks();
            prefetchExecutionFirstPaintChunks();
            // تسخين عميق رفيع بعد أول paint — اللوحات الثقيلة تبقى لنية التبويب/البلاط.
            scheduleIdleWork(() => {
                prefetchExecutionDeepWarmChunks();
            }, 250);
            break;
        default:
            break;
    }
}

let cachedExecutionModule: ExecutionDashboardModule | null = null;
let firstPaintReadyPromise: Promise<void> | null = null;
let firstPaintReady = false;

export function getCachedExecutionDashboard(): ExecutionDashboardModule | null {
    return cachedExecutionModule;
}

export function isExecutionDossierFirstPaintReady(): boolean {
    return firstPaintReady;
}

/**
 * ينتظر بوابة الإضبارة + جسم الهاتف + أقسام أول viewport.
 * وحدة ExecutionDashboard السمينة تُبدأ دون انتظار — لا تُدخل في مسار الجاهزية.
 */
export function ensureExecutionDossierFirstPaintReady(
    opts?: ExecutionDashboardPrefetchOptions,
): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    if (firstPaintReady) return Promise.resolve();

    if (!firstPaintReadyPromise) {
        firstPaintReadyPromise = (async () => {
            prefetchExecutionDossierStylesIfNeeded(opts?.includeFeatureStyles);
            prefetchExecutionFirstPaintChunks();
            prefetchExecutionShellChunks();
            void loadExecutionDashboardModule()
                .then((mod) => {
                    cachedExecutionModule = mod;
                })
                .catch(() => {
                    resetExecutionDashboardModuleCache();
                });

            const [portalLazy, phoneLazy, baseScope, shellRegistry] = await Promise.all([
                import('@/app/components/lawyer/dashboard/executionDashboardPortalLazy'),
                import('@/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyLazy'),
                import(
                    '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardBaseScopeCache'
                ),
                import(
                    '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryShell'
                ),
            ]);

            await Promise.all([
                portalLazy.LazyExecutionDashboardPortal.preload().catch(() => undefined),
                phoneLazy.LazyExecutionDashboardPhoneBody.preload().catch(() => undefined),
                shellRegistry.preloadExecutionDashboardFirstViewportSections(),
                baseScope.loadAndCacheExecutionDashboardBaseScopeBuilder().then(
                    () => undefined,
                    () => undefined,
                ),
            ]);

            firstPaintReady = true;
        })().catch(() => {
            firstPaintReadyPromise = null;
        });
    }

    return firstPaintReadyPromise ?? Promise.resolve();
}

export function primeExecutionDossierSurface(opts?: ExecutionDashboardPrefetchOptions): void {
    if (typeof window === 'undefined') return;
    prefetchExecutionDashboardByMode('urgent', opts);
    void ensureExecutionDossierFirstPaintReady(opts);
}
