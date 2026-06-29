/**
 * عند hover/لمس المنتدى — تجهيز mount فقط.
 * لا dynamic import هنا: أي import() في هذا الملف يُسحَب إلى modulepreload عبر entry graph.
 * تحميل CommunityScreen/overlays يتم عند الفتح عبر lazyComponents أو داخل CommunityScreen.
 */
export function warmForumOnHover(): void {
    if (typeof window !== 'undefined') {
        void import('@/app/services/forum/forumPostsWarmCache').then((m) => m.warmForumPostsCache());
    }
}

/** عند فتح المنتدى */
export function warmForumOnOpen(): void {
    warmForumOnHover();
    if (typeof window === 'undefined') return;
    void import('@/app/services/forum/forumPostsWarmCache').then((m) => m.warmForumPostsCache());
    void import('@/app/components/lawyer/CommunityScreen/communityOverlayPrefetch').then((m) =>
        m.prefetchCommunityHeavyOverlays(),
    );
}
