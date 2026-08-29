/**
 * مسار تسخين موحّد للملف المهني — نقطة دخول واحدة بدل prefetch متفرق.
 *
 * boot   → shell chunks فقط (بعد الإقلاع)
 * hover  → shell + data (بدون استوديو)
 * open   → data sync + shell hydrate (بدون استوديو)
 * studio → primeProfileStudio عند نية فتح الاستوديو فقط
 *
 * بلا استيراد sync لمحمّلات الاستوديو/الورقة/FX — حتى لا يسحبها ProfileTabHost إلى stem.
 */

export type ProfilePrimeTier = 'boot' | 'hover' | 'open';

async function shouldAggressiveProfileWarm(): Promise<boolean> {
    const { isSectionBackgroundPrefetchAllowed } = await import('@/app/runtime/sectionPrefetchPolicy');
    return isSectionBackgroundPrefetchAllowed();
}

export function primeProfileStudio(): void {
    void import('@/app/runtime/profileSettingsSheetLoader')
        .then((m) => m.prefetchProfileSettingsSheetModule())
        .catch(() => undefined);
    void import('@/app/runtime/profileSettingsStudioTabsLoader')
        .then((m) => m.prefetchProfileStudioChunk('appearance'))
        .catch(() => undefined);
}

function primeProfileData(userId?: string | null, mode: 'sync' | 'full' = 'full'): void {
    const uid = userId?.trim();
    if (!uid) return;
    void import('@/app/services/profile/profileWarmCache')
        .then((m) => {
            m.hydrateProfileWarmCachePeekSync(uid);
            if (mode === 'full') {
                m.prefetchProfileData(uid);
            }
        })
        .catch(() => undefined);
}

function primeProfileShellChunks(): void {
    /* التبويب sync في MainView — تسخين Royal فقط عند الحاجة (منتدى / كاش ديناميكي) */
    void import('@/app/runtime/royalLawyerProfileLoader')
        .then((m) => m.prefetchRoyalLawyerProfileChunk())
        .catch(() => undefined);
}

function scheduleDeferredFx(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void shouldAggressiveProfileWarm().then((ok) => {
        if (!ok) return;
        void import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader')
            .then((m) => m.prefetchProfileCanvasFxCore())
            .catch(() => undefined);
    });
}

function prefetchAndroidProfileFx(): void {
    void import('@/app/runtime/profileAndroidFxLoader')
        .then((m) => m.prefetchProfileAndroidFx())
        .catch(() => undefined);
}

/** التسلسل الرسمي للتسخين — لا تُضاف prefetch خارج هذه الوحدة */
export function primeProfileShell(tier: ProfilePrimeTier, userId?: string | null): void {
    switch (tier) {
        case 'boot':
            primeProfileShellChunks();
            prefetchAndroidProfileFx();
            return;
        case 'hover':
            primeProfileData(userId, 'full');
            primeProfileShellChunks();
            prefetchAndroidProfileFx();
            scheduleDeferredFx();
            return;
        case 'open':
            primeProfileData(userId, 'full');
            primeProfileShellChunks();
            prefetchAndroidProfileFx();
            void import('@/app/runtime/profileBootHydrator')
                .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, true))
                .catch(() => undefined);
            /* FX بعد الإطار — لا تنافس snap الصفحة؛ الاستوديو عند زرّه فقط */
            queueMicrotask(() => {
                scheduleDeferredFx();
            });
            return;
        default: {
            const _exhaustive: never = tier;
            return _exhaustive;
        }
    }
}

export function primeProfileForBoot(): void {
    prefetchAndroidProfileFx();
    /* استيراد واحد: تسخين + load — يغطي المنتدى/الكاش الديناميكي */
    void import('@/app/runtime/royalLawyerProfileLoader')
        .then((m) => {
            m.prefetchRoyalLawyerProfileChunk();
            return m.loadProfileHubModule();
        })
        .catch(() => undefined);
}

export function primeProfileForHover(userId?: string | null): void {
    primeProfileShell('hover', userId);
}

export function primeProfileForOpen(userId?: string | null): void {
    primeProfileShell('open', userId);
}

/** aliases — كانت في profileIntentWarm (غلاف ميت) */
export function warmProfileOnHover(userId?: string | null): void {
    primeProfileForHover(userId);
}

export function warmProfileOnOpen(userId?: string | null): void {
    primeProfileForOpen(userId);
}
