import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('نظافة قسم البحث الشامل — بلا ميت ولا تكرار براميل', () => {
    it('لا دوال/كاش ميت في المُحمّل والتسخين والعامل', () => {
        const loader = read('src/app/runtime/globalSearchLoader.ts');
        expect(loader).not.toContain('getCachedGlobalSearchOverlay');
        expect(loader).not.toContain('cachedGlobalSearchOverlay');
        expect(loader).not.toContain('resetGlobalSearchOverlayModuleCacheForTests');
        expect(loader).not.toContain('resetGlobalSearchOverlayModuleStateForTests');
        expect(loader).not.toMatch(/^export function prefetchGlobalSearchOverlay\(/m);

        const moduleState = read('src/app/runtime/globalSearchModuleState.ts');
        expect(moduleState).not.toContain('resetGlobalSearchOverlayModuleStateForTests');

        const warm = read('src/app/services/globalSearchWarm.ts');
        expect(warm).not.toContain('isGlobalSearchPipelineWarm');

        const fuse = read('src/app/services/globalSearchFuse.ts');
        expect(fuse).not.toMatch(/^export async function createGlobalSearchFuse/m);

        const worker = read('src/app/services/search/globalSearchIndexWorkerClient.ts');
        expect(worker).not.toContain('isGlobalSearchWorkerAvailable');
        expect(worker).not.toContain('terminateGlobalSearchIndexWorker');

        const highlight = read('src/app/services/search/globalSearchHighlightPattern.ts');
        expect(highlight).not.toContain('queryHasHighlightableMatch');
    });

    it('تلميح الخمول وشرائح التصنيف مصدر واحد', () => {
        const labels = read(
            'src/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels.ts',
        );
        expect(labels).toContain("export const GLOBAL_SEARCH_IDLE_HINT");
        expect(labels).toContain('اكتب للبحث في الملفات والمواعيد والملاحظات');
        expect(labels).toContain('export const GLOBAL_SEARCH_SCOPE_CHIP_LABELS');

        const idle = read(
            'src/app/components/lawyer/GlobalSearchOverlay/components/SearchIdlePanel.tsx',
        );
        expect(idle).toContain('GLOBAL_SEARCH_IDLE_HINT');
        expect(idle).not.toContain('اكتب للبحث في الملفات والمواعيد والملاحظات');

        const html = read('src/app/runtime/globalSearchInstantSheetHtml.ts');
        expect(html).toContain('GLOBAL_SEARCH_SCOPE_CHIP_LABELS');
        expect(html).toContain('GLOBAL_SEARCH_IDLE_HINT');
        expect(html).not.toContain('GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS');
        expect(html).not.toContain('GLOBAL_SEARCH_INSTANT_IDLE_HINT');

        const chrome = read(
            'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantSheetChrome.tsx',
        );
        expect(chrome).toContain('GLOBAL_SEARCH_SCOPE_CHIP_LABELS');
        expect(chrome).not.toContain('GLOBAL_SEARCH_INSTANT_SCOPE_CHIPS');

        const scopes = read('src/app/components/lawyer/GlobalSearchOverlay/searchScopes.ts');
        expect(scopes).toContain('GLOBAL_SEARCH_SCOPE_CHIP_LABELS');
        expect(scopes).not.toMatch(/^export function resolveSearchScopeCategories/m);
        expect(scopes).not.toContain('export type GlobalSearchScopeChip');
    });

    it('لا سلسلة isLoadingExtras ميتة ولا قشرة InstantShell في المراقب', () => {
        const extras = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchExtras.ts',
        );
        expect(extras).not.toContain('isLoadingExtras');
        const index = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchIndex.ts',
        );
        expect(index).not.toContain('isLoadingExtras');
        const plan = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan.ts',
        );
        expect(plan).not.toContain('isLoadingExtras');
        expect(plan).not.toContain('extrasReady:');
        const provider = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider.tsx',
        );
        expect(provider).not.toContain('isLoadingExtras');

        const observe = read(
            'src/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive.ts',
        );
        expect(observe).not.toContain('data-search-instant-shell');

        const query = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery.ts',
        );
        expect(query).not.toContain('isSearching');
        expect(query).not.toMatch(/return \{ query, setQuery, debouncedQuery/);
    });

    it('واجهة الشِل بلا setters داخلية مسربة وبلا reset ميت', () => {
        const hook = read(
            'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts',
        );
        expect(hook).not.toContain('resetGlobalSearchShell');
        expect(hook).not.toContain('export type SetShowGlobalSearch');
        expect(hook).not.toMatch(/return \{[\s\S]*setShowGlobalSearch,/);
        expect(hook).not.toMatch(/return \{[\s\S]*setSearchIndexVersion,/);
        expect(hook).toContain('bumpSearchIndex');
        expect(hook).toContain('openGlobalSearch');
        expect(hook).toContain('closeGlobalSearch');

        const lifecycle = read(
            'src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle.ts',
        );
        expect(lifecycle).not.toContain('userId: string | null');

        const constants = read(
            'src/app/components/lawyer/GlobalSearchOverlay/constants.ts',
        );
        expect(constants).not.toContain('globalSearchA11yIds');
        expect(constants).not.toContain('GLOBAL_SEARCH_LISTBOX_ID');
    });

    it('لا قواعد CSS مكررة مطابقة في الطبقة', () => {
        const layer = read(
            'src/app/components/lawyer/GlobalSearchOverlay/overlayCss/gsLayer.css',
        );
        expect(layer).toContain("html[data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]");
        expect(layer).not.toContain(
            "html[data-hami-native='1'][data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]",
        );
        expect(layer).not.toContain(":not([data-hami-platform='ios'])");
        expect(layer).toContain('backdrop-filter: none !important');

        const chrome = read(
            'src/app/components/lawyer/GlobalSearchOverlay/overlayCss/gsChrome.css',
        );
        expect(chrome).not.toContain('html.reduce-motion .hami-gs-scope-chip');
        expect(chrome.split('\n').length).toBeLessThan(280);

        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels.ts'),
            ),
        ).toBe(true);
    });
});
