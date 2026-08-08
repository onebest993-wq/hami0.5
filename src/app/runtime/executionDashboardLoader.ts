/**
 * تحميل مرحلي لإضبارة التنفيذ — chunk رئيسي أولاً، ثم shell عند الخمول أو النية.
 */
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { prefetchDeferredFeatureStyles } from '@/app/runtime/deferredFeatureStyles';

type ExecutionDashboardModule = typeof import('@/app/components/lawyer/ExecutionDashboard.tsx');

export type ExecutionDashboardPrefetchMode = 'deferred' | 'intent' | 'urgent';

let executionModulePromise: Promise<ExecutionDashboardModule> | null = null;

export function resetExecutionDashboardModuleCache(): void {
    executionModulePromise = null;
}

function createExecutionModuleImport(): Promise<ExecutionDashboardModule> {
    return import('@/app/components/lawyer/ExecutionDashboard.tsx')
        .then((mod) => mod)
        .catch((err) => {
            executionModulePromise = null;
            throw err;
        });
}

export function loadExecutionDashboardModule(): Promise<ExecutionDashboardModule> {
    if (!executionModulePromise) {
        executionModulePromise = createExecutionModuleImport();
    }
    return executionModulePromise;
}

function prefetchExecutionShellChunks(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')
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
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')
        .then((shell) => {
            shell.prefetchExecutionDashboardPhoneBody();
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
 * تسخين عميق كامل (idle فقط) — جسم الهاتف + overlays + محضر المتابعة + جسور
 * المعالجات الحرجة. بدونه كان أول فتح بارد يسحب مئات الوحدات بعد النقر.
 */
function prefetchExecutionDeepWarmChunks(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell')
        .then((shell) => {
            shell.prefetchExecutionDashboardPhoneBody();
            shell.prefetchExecutionDashboardShellOverlays();
            shell.prefetchFollowupMemoPanels();
            shell.prefetchExecutionFollowupModalPortal();
            // أبناء shell overlays التي كانت تُحمَّل لحظة الفتح (سويتشر/قانون/مالية/حجز)
            shell.prefetchExecutionOverlayModals();
            shell.prefetchLawReferencePanel();
            shell.prefetchUnifiedSeizureLogHost();
            shell.prefetchExecutionFinancialHubPortal();
            shell.prefetchExecutionDossierDeepSurface();
            shell.prefetchExecutionModalContainers();
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
    // وحدة overlay scope المؤجّلة — كانت تُستورد لحظة الحاجة داخل الإضبارة
    void import(
        '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardCoreScopeSourcesOverlayLazy'
    ).catch(() => undefined);
    // base scope (~42KB gz) — يُحمَّل بعد أول paint داخل الإضبارة؛ تسخينه هنا يمنع waterfall
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

/**
 * الموجة الأخيرة — كل تبويبات محضر المتابعة + جسورها. بعدها لا يبقى أي chunk
 * بارد داخل قسم التنفيذ: فتح المحضر والتنقل بين تبويباته يصبح لحظياً.
 */
function prefetchExecutionFollowupFullWarm(): void {
    void import('@/app/components/lawyer/ExecutionDashboard/executionFollowupTabPrefetch')
        .then((m) => {
            m.prefetchAllExecutionFollowupTabs();
        })
        .catch(() => undefined);
}

/** يبدأ تحميل الـ chunk الرئيسي فقط — بدون منافسة أرشيف التنفيذ */
export function prefetchExecutionDashboardCore(): void {
    if (typeof window === 'undefined') return;
    prefetchDeferredFeatureStyles();
    void loadExecutionDashboardModule().catch(() => {
        executionModulePromise = null;
    });
}

/**
 * تسخين خفيف لمسار Instant (portal + first-paint) — بدون تحميل chunk التنفيذ الكامل.
 * يُستخدم من executionBootHydrator عند الإقلاع.
 */
export function prefetchExecutionDashboardChromeWarm(): void {
    if (typeof window === 'undefined') return;
    prefetchDeferredFeatureStyles();
    prefetchExecutionFirstPaintChunks();
    void import('@/app/components/lawyer/dashboard/ExecutionDashboardBootChrome').catch(() => undefined);
}

/**
 * deferred: بعد فتح قسم التنفيذ — لا يُشغَّل على مسار الفتح المباشر
 * intent: hover على بطاقة/الهَب — chunk رئيسي فوراً، shell عند الخمول
 * urgent: نقرة فتح إضبارة — chunk + shell الحرجة فوراً
 */
export function prefetchExecutionDashboardByMode(mode: ExecutionDashboardPrefetchMode): void {
    if (typeof window === 'undefined') return;

    switch (mode) {
        case 'deferred':
            scheduleIdleWork(() => {
                prefetchExecutionDashboardCore();
                void loadExecutionDashboardModule()
                    .then(() =>
                        scheduleIdleWork(() => {
                            prefetchExecutionShellChunks();
                            // سلسلة أول paint كاملة مع الـ shell — لا تنتظر موجة deep warm
                            prefetchExecutionFirstPaintChunks();
                            // موجة أخيرة idle — تجعل أول فتح فعلي بلا أي تحميل شبكة تقريباً
                            scheduleIdleWork(() => {
                                prefetchExecutionDeepWarmChunks();
                                scheduleIdleWork(() => prefetchExecutionFollowupFullWarm(), 700);
                            }, 600);
                        }, 500),
                    )
                    .catch(() => undefined);
            }, 800);
            break;
        case 'intent':
            // hover/دخول الأرشيف: النقرة تأتي عادة خلال أقل من ثانية —
            // كل ما يلزم لأول paint (core + shell + body + portal) يُحمَّل فوراً.
            prefetchExecutionDashboardCore();
            prefetchExecutionShellChunks();
            prefetchExecutionFirstPaintChunks();
            scheduleIdleWork(() => {
                prefetchExecutionDeepWarmChunks();
                scheduleIdleWork(() => prefetchExecutionFollowupFullWarm(), 600);
            }, 450);
            break;
        case 'urgent':
            // فتح مباشر: كل سلسلة أول paint بالتوازي فوراً — أي جزء مؤجَّل منها
            // كان يتحول لحلقة waterfall بعد النقرة (chrome يظهر والمحتوى ينتظر).
            prefetchExecutionDashboardCore();
            prefetchExecutionShellChunks();
            prefetchExecutionFirstPaintChunks();
            // تسخين عميق سريع بعد أول paint — محضر المتابعة/الجسور كانت تبقى باردة
            // عند الفتح المباشر ويشعر المستخدم بثقل أول نقرة داخل الإضبارة.
            scheduleIdleWork(() => {
                prefetchExecutionDeepWarmChunks();
                scheduleIdleWork(() => prefetchExecutionFollowupFullWarm(), 500);
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
 * ينتظر سلسلة أول paint حتى تكتمل — يُستدعى قبل setActiveFile حتى يصبح
 * أول فتح كالثاني (بلا BootChrome / PhoneBodyLoadingShell).
 */
export function ensureExecutionDossierFirstPaintReady(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    if (firstPaintReady) return Promise.resolve();

    if (!firstPaintReadyPromise) {
        firstPaintReadyPromise = (async () => {
            prefetchDeferredFeatureStyles();
            prefetchExecutionFirstPaintChunks();
            prefetchExecutionShellChunks();
            void loadExecutionDashboardModule()
                .then((mod) => {
                    cachedExecutionModule = mod;
                })
                .catch(() => {
                    executionModulePromise = null;
                });

            const [portalLazy, phoneLazy, baseScope, shell] = await Promise.all([
                import('@/app/components/lawyer/dashboard/executionDashboardPortalLazy'),
                import('@/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyLazy'),
                import(
                    '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardBaseScopeCache'
                ),
                import('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell'),
            ]);

            await Promise.all([
                portalLazy.LazyExecutionDashboardPortal.preload().catch(() => undefined),
                phoneLazy.LazyExecutionDashboardPhoneBody.preload().catch(() => undefined),
                baseScope.loadAndCacheExecutionDashboardBaseScopeBuilder().then(
                    () => undefined,
                    () => undefined,
                ),
                loadExecutionDashboardModule().then(
                    (mod) => {
                        cachedExecutionModule = mod;
                    },
                    () => undefined,
                ),
            ]);

            // ثبّت Resolved داخل Portal's LazyExecutionDashboard (نفس وحدة loadExecutionDashboardModule)
            await import('@/app/components/lawyer/dashboard/ExecutionDashboardPortal')
                .then((m) => m.prefetchExecutionDashboardComponent())
                .catch(() => undefined);

            firstPaintReady = true;
        })().catch(() => {
            firstPaintReadyPromise = null;
        });
    }

    return firstPaintReadyPromise ?? Promise.resolve();
}

export function primeExecutionDossierSurface(): void {
    if (typeof window === 'undefined') return;
    prefetchExecutionDashboardByMode('urgent');
    void ensureExecutionDossierFirstPaintReady();
}
