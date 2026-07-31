/**
 * prefetch أرشيف الإضابير — وحدة خفيفة بلا lazyComponents/ForumApi/SAC.
 */
let archivePortalPrefetch: Promise<unknown> | null = null;

export function resetArchivePortalPrefetch(): void {
    archivePortalPrefetch = null;
}

/** تحميل مسبق أرشيف الإضابير — يمر عبر hubArchiveLoader لذاكرة موحّدة */
export function prefetchArchivePortal(): void {
    if (typeof window === 'undefined') return;
    if (!archivePortalPrefetch) {
        archivePortalPrefetch = import('@/app/runtime/hubArchiveLoader')
            .then((m) => m.loadArchivePortalModule())
            .catch((err) => {
                archivePortalPrefetch = null;
                throw err;
            });
    }
    void archivePortalPrefetch.catch(() => undefined);
}
