import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('إكمال بقايا البحث الشامل — لا تعود بعد الإصلاح', () => {
    it('تسخين extras ديناميكي بلا منتدى، والورقة تسحب المجتمع عند الفتح', () => {
        const load = read('src/app/services/globalSearchLoad.ts');
        expect(load).not.toMatch(/from '@\/app\/services\/lawyer-cloud'/);
        expect(load).not.toMatch(/from '@\/app\/services\/vault\/smartVaultRuntime'/);
        expect(load).not.toMatch(/from '@\/app\/services\/forum\/communityCloudLoader'/);
        expect(load).toContain("import('@/app/services/cloud/lawyerRepositoryCloud')");
        expect(load).toContain("import('@/app/services/vault/smartVaultRuntime')");
        expect(load).toContain("import('@/app/services/forum/communityCloudLoader')");
        expect(load).not.toContain("import('@/app/services/lawyer-cloud')");
        expect(load).toContain('includeCommunityPosts');
        expect(load).toContain('void loadGlobalSearchExtras(userId, { includeCommunityPosts: false })');

        const warm = read('src/app/services/globalSearchWarm.ts');
        expect(warm).toContain('loadGlobalSearchExtras(uid, { includeCommunityPosts: false })');

        const extras = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchExtras.ts',
        );
        expect(extras).toContain('includeCommunityPosts: true');
        expect(extras).toContain('OVERLAY_EXTRAS_OPTIONS');
    });

    it('التحضير لا يقرأ lawyer_notes، ومفتاح extras بفاصل gsx وهاش محتوى', () => {
        const prepare = read('src/app/services/globalSearchIndexPrepare.ts');
        expect(prepare).not.toContain('STORAGE_KEYS');
        expect(prepare).not.toContain('persistenceRepository');
        expect(prepare).not.toContain('LAWYER_NOTES');
        expect(prepare).not.toContain('const preparedStoredNotes');
        expect(prepare).toContain('composeGlobalSearchIndexCacheKey');
        expect(prepare).toContain('globalSearchExtrasSignature');

        const sig = read('src/app/services/globalSearchExtrasSignature.ts');
        expect(sig).toContain("GLOBAL_SEARCH_INDEX_EXTRAS_MARK = '|gsx:'");
        expect(sig).toContain('threadingTasks.length');
        expect(sig).toContain('djb2Hash(extrasSearchBlob(extras))');

        const plan = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan.ts',
        );
        expect(plan).toContain('keepVisibleIndex');
        expect(plan).toContain("from '@/app/services/globalSearchExtrasSignature'");
        expect(plan).toContain('isLoadingIndex: input.isBuildingIndex && !keyCurrent && !keepVisibleIndex');
    });

    it('ترتيب Fuse مستقل، والكروم المشترك، والأخيرة بلا أثر جانبي داخل setState', () => {
        expect(existsSync(join(root, 'src/app/services/globalSearchFuseRank.ts'))).toBe(true);
        const fuse = read('src/app/services/globalSearchFuse.ts');
        expect(fuse).toContain("from '@/app/services/globalSearchFuseRank'");
        expect(fuse).not.toContain('export function rankGlobalSearchHits');
        expect(fuse).not.toContain('function fieldContainsAll');

        const rank = read('src/app/services/globalSearchFuseRank.ts');
        expect(rank).toContain('export function rankGlobalSearchHits');
        expect(rank).toContain('tokens.every((t) => hay.includes(t))');

        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/GlobalSearchOverlay/searchInstantChromeClasses.ts',
                ),
            ),
        ).toBe(true);
        const chrome = read(
            'src/app/components/lawyer/GlobalSearchOverlay/searchInstantChromeClasses.ts',
        );
        expect(chrome).toContain('text-[16px]');
        expect(chrome).toContain('min-h-[44px]');

        const header = read(
            'src/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader.tsx',
        );
        const instant = read(
            'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantSheetChrome.tsx',
        );
        const html = read('src/app/runtime/globalSearchInstantSheetHtml.ts');
        for (const src of [header, instant, html]) {
            expect(src).toContain('GS_SEARCH_INPUT_CLASS');
            expect(src).toContain('GS_TITLE_ROW_CLASS');
            expect(src).toContain('GS_CLOSE_BTN_CLASS');
        }
        expect(instant).toContain("from '@/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels'");

        const recents = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearch.ts',
        );
        expect(recents).toContain('recentSearchesRef');
        expect(recents).toContain('pushGlobalSearchRecentLabel');
        expect(recents).not.toContain('setRecentSearches((prev) => {');

        expect(
            existsSync(join(root, '.audit/PHASE_GLOBAL_SEARCH_REMAINING_COMPLETION_CLOSURE.md')),
        ).toBe(true);
    });
});
