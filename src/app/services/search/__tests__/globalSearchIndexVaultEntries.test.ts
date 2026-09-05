import { afterEach, describe, expect, it } from 'vitest';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import { emptyGlobalSearchExtras } from '@/app/services/globalSearchExtrasCache';
import { buildGlobalSearchIndex } from '@/app/services/globalSearchIndex';
import {
    exactScanGlobalSearchHits,
    getGlobalSearchFuseDocs,
    getOrCreateGlobalSearchFuse,
    invalidateGlobalSearchFuseCache,
    mergeSearchHitLists,
    rankGlobalSearchHits,
} from '@/app/services/globalSearchFuse';
import { vaultToEntry } from '@/app/services/search/globalSearchIndexVaultEntries';
import { PERFORMANCE } from '@/app/utils/constants';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type Fuse from 'fuse.js';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

function doc(overrides: Partial<SmartVaultDoc>): SmartVaultDoc {
    return {
        id: 'v1',
        title: 'عقد إيجار',
        type: 'pdf',
        tags: ['عقود'],
        authorId: 'u1',
        createdAt: 't',
        updatedAt: 't',
        fileSize: 1,
        fileName: 'lease.pdf',
        mimeType: 'application/pdf',
        storagePath: 'p',
        ...overrides,
    };
}

function searchLikeOverlay(fuse: Fuse<GlobalSearchEntry>, query: string): GlobalSearchEntry[] {
    const raw = fuse.search(normalizeArabic(query));
    let ranked = rankGlobalSearchHits(query, raw, PERFORMANCE.MAX_SEARCH_RESULTS);
    const docs = getGlobalSearchFuseDocs(fuse);
    if (docs && ranked.length < Math.min(12, PERFORMANCE.MAX_SEARCH_RESULTS)) {
        ranked = mergeSearchHitLists(
            ranked,
            exactScanGlobalSearchHits(query, docs, PERFORMANCE.MAX_SEARCH_RESULTS),
            PERFORMANCE.MAX_SEARCH_RESULTS,
        );
    }
    return ranked;
}

describe('vaultToEntry', () => {
    it('ملاحظة المحامي في haystack دون تغيير المقتطف أو فتح وثيقة محددة', () => {
        const entry = vaultToEntry(
            doc({
                aiSummary: 'ملخص آلي',
                lawyerNote: 'شرط فسخ خاص بالموكل',
            }),
        );
        expect(entry._searchStr).toContain('شرط فسخ');
        expect(entry.snippet).toBe('ملخص آلي');
        expect(entry.navigate).toEqual({ type: 'vault' });
    });

    it('لا يفهرس extractedText — بحث النص المستخرج داخل الخزنة', () => {
        const entry = vaultToEntry(
            doc({
                extractedText: 'عبارة فريدة من جسم الـ PDF لن تظهر في العدسة',
            }),
        );
        expect(entry._searchStr).not.toContain('عبارة فريدة');
    });
});

describe('عدسة البحث على وثيقة خزنة — نفس مسار الورقة', () => {
    afterEach(() => {
        invalidateGlobalSearchFuseCache();
    });

    it('استعلام ملاحظة المحامي يُظهر وثيقة الخزنة ولا يظهر عنواناً آخر', async () => {
        const extras = emptyGlobalSearchExtras();
        extras.vaultDocs = [
            doc({
                id: 'v-note',
                title: 'عقد إيجار',
                lawyerNote: 'شرط فسخ خاص بالموكل',
            }),
            doc({
                id: 'v-other',
                title: 'توكيل عام',
                fileName: 'wakala.pdf',
                tags: [],
            }),
        ];
        const index = buildGlobalSearchIndex({
            files: [],
            globalNotes: [],
            cases: [],
            extras,
        });
        const fuse = await getOrCreateGlobalSearchFuse('vault-lawyer-note-probe', index);
        const hits = searchLikeOverlay(fuse, 'شرط فسخ');
        expect(hits.map((e) => e.id)).toContain('vault-v-note');
        expect(hits.map((e) => e.id)).not.toContain('vault-v-other');
    });
});
