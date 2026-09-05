import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('إغلاق قسم البحث الشامل — صدق لا شعار', () => {
    it('تقرير الإغلاق لا يدّعي مثالية ولا Playwright أو tsc أو جهازاً', () => {
        const rel = '.audit/PHASE_GLOBAL_SEARCH_SECTION_CLOSURE.md';
        expect(existsSync(join(root, rel))).toBe(true);
        const report = read(rel);
        expect(report).toContain('لم يُشغَّل');
        expect(report).toContain('Playwright');
        expect(report).not.toContain('مثالي');
        expect(report).toContain('جاهز للانتقال');
    });

    it('فجوات نقد الدفعة السابقة مقفولة: هاش extras، تسخين بلا منتدى سلوكياً، أخيرة بلا setState غير نقي', () => {
        const sig = read('src/app/services/globalSearchExtrasSignature.ts');
        expect(sig).toContain("GLOBAL_SEARCH_INDEX_EXTRAS_MARK = '|gsx:'");
        expect(sig).toContain('threadingTasks.length');
        expect(sig).toContain('djb2Hash(extrasSearchBlob(extras))');

        const loadTest = read('src/app/services/__tests__/globalSearchLoad.test.ts');
        expect(loadTest).toContain("includeCommunityPosts: false");
        expect(loadTest).toContain('listDocuments).not.toHaveBeenCalled');
        expect(loadTest).toContain("includeCommunityPosts: true");

        const recents = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearch.ts',
        );
        expect(recents).toContain('recentSearchesRef.current = next');
        expect(recents).not.toContain('setRecentSearches((prev) => {');

        const prepare = read('src/app/services/globalSearchIndexPrepare.ts');
        expect(prepare).not.toContain('const preparedStoredNotes');
        expect(prepare).not.toContain('LAWYER_NOTES');
    });
});
