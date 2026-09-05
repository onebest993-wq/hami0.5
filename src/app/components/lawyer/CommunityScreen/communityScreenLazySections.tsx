import { readPersistedCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import { prefetchCommunityFollowingPanel } from '@/app/components/lawyer/CommunityScreen/communityFollowingPrefetch';
import { settleIdleChunkPrefetch } from '@/app/components/lawyer/CommunityScreen/settleIdleChunkPrefetch';
import { isOpenSectionInnerJsPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

export { prefetchCommunityFollowingPanel };

const legalRepositoryImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/LegalRepository').then((m) => ({
        default: m.LegalRepository,
    }));

const forumGroupsSectionImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumGroupsSection');

/** JS فقط — بلا listDocuments حتى لا ينافس تغذية المنتدى */
export function prefetchCommunityRepositorySectionChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return settleIdleChunkPrefetch('forum-legal-repository', legalRepositoryImport());
}

export function prefetchCommunityRepositorySection(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    void settleIdleChunkPrefetch(
        'forum-repository-docs-warm',
        import('@/app/services/forum/repositoryDocsWarmCache').then((m) => {
            m.warmRepositoryDocsCache();
        }),
    );
    return prefetchCommunityRepositorySectionChunk();
}

export function prefetchCommunityGroupsSection(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return settleIdleChunkPrefetch('forum-groups-section', forumGroupsSectionImport());
}

/** JS للمستودع والمجموعات — مرة واحدة، بلا كاش شبكة */
export function prefetchCommunityLazySectionChunks(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return Promise.all([
        prefetchCommunityRepositorySectionChunk(),
        prefetchCommunityGroupsSection(),
    ]).then(() => undefined);
}

/** بعد فتح المنتدى: JS للأقسام الداخلية إن سمحت السياسة (خفيف نعم، شبكة بطيئة لا) */
export function prefetchOpenForumInnerSectionChunks(): void {
    if (typeof window === 'undefined') return;
    if (!isOpenSectionInnerJsPrefetchAllowed()) return;
    void prefetchCommunityLazySectionChunks();
}

/** مقطع القسم المحفوظ — JS فقط حتى لا ينافس تغذية المنتدى عند التحميل */
export function prefetchPersistedCommunitySectionChunk(): void {
    if (typeof window === 'undefined') return;
    const section = readPersistedCommunitySection();
    if (section === 'groups') prefetchCommunityGroupsSection();
    else if (section === 'repository') prefetchCommunityRepositorySectionChunk();
}

/** خمول: لوحة المتابعة فقط — مقاطع الأقسام تُحمَّل فوراً عند الفتح */
export function scheduleIdleCommunityLazySectionPrefetch(onChunksReady?: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    if (isLitePerformanceActive()) return () => undefined;
    let cancelled = false;
    const run = () => {
        prefetchCommunityFollowingPanel();
        if (!cancelled) onChunksReady?.();
    };
    if (typeof window.requestIdleCallback === 'function') {
        const idleId = window.requestIdleCallback(run, { timeout: 1_800 });
        return () => {
            cancelled = true;
            window.cancelIdleCallback(idleId);
        };
    }
    const timer = window.setTimeout(run, 450);
    return () => {
        cancelled = true;
        window.clearTimeout(timer);
    };
}
