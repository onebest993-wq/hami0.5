import { describe, expect, it } from 'vitest';
import {
    exactScanGlobalSearchHits,
    mergeSearchHitLists,
    rankGlobalSearchHits,
} from '@/app/services/globalSearchFuse';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

function entry(
    overrides: Partial<GlobalSearchEntry> & Pick<GlobalSearchEntry, 'id' | 'title'>,
): GlobalSearchEntry {
    const title = overrides.title;
    const subtitle = overrides.subtitle ?? '';
    const snippet = overrides.snippet ?? '';
    const searchStr =
        overrides._searchStr ??
        [title, subtitle, snippet].filter(Boolean).join(' ').toLowerCase();
    return {
        lifecycle: 'active',
        category: 'execution',
        subtitle: '',
        snippet: '',
        navigate: { type: 'vault' },
        ...overrides,
        _searchStr: searchStr,
    };
}

describe('rankGlobalSearchHits', () => {
    it('يستبعد النتائج التي لا تحتوي كل الرموز المهمة', () => {
        const hits = [
            { item: entry({ id: '1', title: 'تنفيذ رهن', _searchStr: 'تنفيذ رهن' }), score: 0.1 },
            { item: entry({ id: '2', title: 'دعوى مدنية', _searchStr: 'دعوى مدنية' }), score: 0.05 },
        ];
        const ranked = rankGlobalSearchHits('تنفيذ رهن', hits);
        expect(ranked.map((e) => e.id)).toEqual(['1']);
    });

    it('يفضّل تطابق العنوان على تطابق النص العام', () => {
        const hits = [
            {
                item: entry({
                    id: 'body',
                    title: 'ملف عام',
                    _searchStr: 'ملف عام رقم 100/2026 تنفيذ',
                }),
                score: 0.05,
            },
            {
                item: entry({
                    id: 'title',
                    title: '100/2026',
                    _searchStr: '100/2026 ملف',
                }),
                score: 0.2,
            },
        ];
        const ranked = rankGlobalSearchHits('100/2026', hits);
        expect(ranked[0]?.id).toBe('title');
    });

    it('يخفض أولوية السلة والأرشيف قليلاً عند تساوي الجودة', () => {
        const hits = [
            {
                item: entry({
                    id: 'trash',
                    title: 'عقد بيع',
                    lifecycle: 'deleted',
                    _searchStr: 'عقد بيع',
                }),
                score: 0.1,
            },
            {
                item: entry({
                    id: 'active',
                    title: 'عقد بيع',
                    lifecycle: 'active',
                    _searchStr: 'عقد بيع',
                }),
                score: 0.1,
            },
        ];
        const ranked = rankGlobalSearchHits('عقد بيع', hits);
        expect(ranked[0]?.id).toBe('active');
        expect(ranked.map((e) => e.id)).toContain('trash');
    });
});

describe('exactScanGlobalSearchHits + merge', () => {
    it('يلتقط تطابقاً نصياً واضحاً', () => {
        const docs = [
            entry({ id: 'a', title: 'إضبارة تنفيذ 55/2024', _searchStr: 'اضباره تنفيذ 55/2024' }),
            entry({ id: 'b', title: 'دعوى أخرى', _searchStr: 'دعوي اخري' }),
        ];
        const exact = exactScanGlobalSearchHits('55/2024', docs);
        expect(exact.map((e) => e.id)).toEqual(['a']);
    });

    it('يدمج دون تكرار', () => {
        const a = entry({ id: 'a', title: 'أ' });
        const b = entry({ id: 'b', title: 'ب' });
        expect(mergeSearchHitLists([a], [a, b]).map((e) => e.id)).toEqual(['a', 'b']);
    });
});
