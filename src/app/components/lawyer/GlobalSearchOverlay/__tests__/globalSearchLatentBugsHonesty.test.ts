import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('علل البحث الشامل الخفية — لا تعود بعد الإصلاح', () => {
    it('عامل الفهرس يسوي كل وعد — بلا generation يعلّق التحميل', () => {
        const worker = read('src/app/services/search/globalSearchIndexWorkerClient.ts');
        expect(worker).not.toContain('activeBuildGeneration');
        expect(worker).not.toContain('job.generation');
        expect(worker).toContain('job.resolve(index ?? [])');
        expect(worker).toContain('pending.set(id, { resolve, reject })');

        const runtime = read('src/app/services/globalSearchIndexRuntime.ts');
        expect(runtime).toContain('inflightByKey');
        expect(runtime).toContain('.then(resolve, reject)');
        expect(runtime).toContain('if (epoch === cacheEpoch)');
        expect(runtime).toContain('inflightByKey.clear()');
    });

    it('إعادة البناء لا تبحث بفهرس مفتاحه قديم', () => {
        const flags = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan.ts',
        );
        expect(flags).toContain('export function resolveSearchIndexUiFlags');
        expect(flags).toContain('appliedKey === input.cacheKey');
        expect(flags).toContain('isLoadingIndex: input.isBuildingIndex && !keyCurrent');

        const provider = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider.tsx',
        );
        expect(provider).toContain('resolveSearchIndexUiFlags');
        expect(provider).not.toContain('isLoadingIndex: !fuse && isBuildingIndex');

        const index = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchIndex.ts',
        );
        expect(index).toContain('appliedKey');
        expect(index).toContain('setAppliedKey(key)');
    });

    it('تحديث extras عند التركيز يُلغى مع الإغلاق أو تبديل المستخدم', () => {
        const extras = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchExtras.ts',
        );
        expect(extras).toContain('const focusedUserId = userId');
        expect(extras).toContain('if (cancelled) return');
        expect(extras).toContain('loadGlobalSearchExtras(focusedUserId');
    });

    it('DocsVault في الفهرس مقيّد بالمستخدم بلا ترحيل المفتاح المشترك', () => {
        const vault = read('src/app/data/DocsVault.ts');
        expect(vault).toContain('setUserScope(userId: string | null)');
        expect(vault).toContain('hami_docs_vault_${userId}');
        expect(vault).not.toContain('migrateLegacyIfEmpty');

        const prepare = read('src/app/services/globalSearchIndexPrepare.ts');
        expect(prepare).toContain('docsVault.setUserScope(source.userId)');
        expect(prepare).not.toContain('docsVault.getDocuments().map');
    });

    it('تمرير النتائج داخل hami-gs-scroll وإغلاق الورقة عند تبديل الحساب', () => {
        const keyboard = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard.ts',
        );
        expect(keyboard).toContain("el.closest('.hami-gs-scroll')");
        expect(keyboard).toContain('scrollGlobalSearchResultIntoView');
        expect(keyboard).toContain('scrollGlobalSearchResultIntoView(el)');

        const shell = read('src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts');
        expect(shell).toContain('previousUserIdRef');
        expect(shell).toContain('switchedAccount');
        expect(shell).toContain('closeGlobalSearch()');
    });
});
