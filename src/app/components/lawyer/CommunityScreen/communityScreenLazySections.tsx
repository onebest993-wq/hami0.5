import { lazy } from 'react';
import { warmRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';
import { readPersistedCommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

const legalRepositoryImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/LegalRepository').then((m) => ({
        default: m.LegalRepository,
    }));

const forumGroupsSectionImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumGroupsSection');

const forumFollowingPanelImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumFollowingPanel').then((m) => ({
        default: m.ForumFollowingPanel,
    }));

export const LazyLegalRepository = lazy(legalRepositoryImport);
export const LazyForumGroupsSection = lazy(forumGroupsSectionImport);
export const LazyForumFollowingPanel = lazy(forumFollowingPanelImport);

/** JS فقط — بلا listDocuments حتى لا ينافس تغذية المنتدى */
export function prefetchCommunityRepositorySectionChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return legalRepositoryImport().then(() => undefined).catch(() => undefined);
}

export function prefetchCommunityRepositorySection(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    warmRepositoryDocsCache();
    return prefetchCommunityRepositorySectionChunk();
}

export function prefetchCommunityGroupsSection(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return forumGroupsSectionImport().then(() => undefined).catch(() => undefined);
}

export function prefetchCommunityFollowingPanel(): void {
    if (typeof window === 'undefined') return;
    void forumFollowingPanelImport().catch(() => undefined);
}

/** JS للمستودع والمجموعات — مرة واحدة، بلا كاش شبكة */
export function prefetchCommunityLazySectionChunks(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return Promise.all([
        prefetchCommunityRepositorySectionChunk(),
        prefetchCommunityGroupsSection(),
    ]).then(() => undefined);
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
