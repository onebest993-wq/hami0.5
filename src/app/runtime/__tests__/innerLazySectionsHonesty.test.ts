import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('inner lazy sections honesty — أقسام داخل القسم', () => {
    it('مستودع/مجموعات المنتدى: كسل + تسخين JS بعد الفتح + InstantPaint', () => {
        const panes = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenLazySectionPanes.tsx',
        );
        const mount = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenLazySectionMount.ts',
        );
        const lazy = read(
            'src/app/components/lawyer/CommunityScreen/communityScreenLazySections.tsx',
        );
        const groups = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumGroupsDirectory.tsx',
        );
        const repo = read(
            'src/app/components/lawyer/CommunityScreen/components/LegalRepository.tsx',
        );

        expect(panes).toContain('LazyLegalRepository');
        expect(panes).toContain('LazyForumGroupsSection');
        expect(panes).toContain('ForumLazySectionInstantSlots');
        expect(panes).not.toContain('fallback={null}');
        expect(mount).toContain('prefetchOpenForumInnerSectionChunks');
        expect(mount).not.toContain('isLitePerformanceActive');
        expect(lazy).toContain('isOpenSectionInnerJsPrefetchAllowed');
        expect(lazy).toContain('prefetchCommunityRepositorySectionChunk()');
        expect(lazy).not.toContain('export const LazyLegalRepository');
        const openInner = lazy.slice(
            lazy.indexOf('export function prefetchOpenForumInnerSectionChunks'),
            lazy.indexOf('export function prefetchPersistedCommunitySectionChunk'),
        );
        expect(openInner).not.toContain('warmRepositoryDocsCache');
        expect(groups).not.toContain('جاري تحميل المجموعات');
        expect(groups).toContain('ForumLazySectionInstantSlots');
        expect(repo).not.toContain('جاري المزامنة');
        expect(repo).toContain('ForumLazySectionInstantSlots');
        expect(repo).toContain('aria-busy={repo.syncing}');
    });

    it('لوحة المتابعة ومعرض الغرف: غطاء InstantPaint لا فراغ', () => {
        const chrome = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenBodyChrome.tsx',
        );
        const tools = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumAppBarTools.tsx',
        );
        const rail = read('src/app/components/lawyer/SmartRepository/RepositoryFiltersRail.tsx');
        expect(chrome).toContain('ForumFollowingInstantCover');
        expect(chrome).not.toContain('fallback={null}');
        expect(tools).toContain('onPointerDown={prefetchCommunityFollowingPanel}');
        expect(tools).toContain("from '../communityFollowingPrefetch'");
        expect(tools).not.toContain('communityScreenLazySections');
        expect(tools).not.toMatch(/function prefetchCommunityFollowingPanel/);
        expect(rail).toContain('RepositoryRoomsGalleryInstantCover');
        expect(rail).not.toContain('fallback={null}');
        expect(rail).toContain("import('./RepositoryRoomsGallery')");
    });

    it('النية على تبويب القسم تُحمّل المقطع؛ البيانات ليست مع الشاشة كلها', () => {
        const catalog = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityGroupsCatalog.ts',
        );
        const bootstrap = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useLegalRepositoryBootstrap.ts',
        );
        const intent = read('src/app/hooks/lawyerDashboard/forumIntentWarm.ts');
        expect(catalog).toContain("activeSection !== 'groups'");
        expect(bootstrap).toContain('allowRemoteFetch');
        expect(intent).toContain('prefetchPersistedCommunitySectionChunk');
        expect(intent).not.toContain('prefetchCommunityRepositorySection');
        expect(intent).not.toContain('prefetchCommunityLazySectionChunks');
    });
});
