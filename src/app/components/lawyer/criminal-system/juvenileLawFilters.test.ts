import { describe, expect, it } from 'vitest';
import {
    articleMatchesJuvenileLawFilter,
    filterJuvenileLawArticles,
    JUVENILE_LAW_FILTERS,
    resolveJuvenileFilterArticleRange,
} from './juvenileLawFilters';

describe('juvenileLawFilters', () => {
    it('defines five main tabs covering articles 1–112', () => {
        expect(Object.keys(JUVENILE_LAW_FILTERS)).toHaveLength(5);
        expect(JUVENILE_LAW_FILTERS['المبادئ والتأسيس (1–15)'].range).toEqual([1, 15]);
        expect(JUVENILE_LAW_FILTERS['المراقبة والرعاية (87–112)'].range).toEqual([87, 112]);
    });

    it('filters by sub-chip range', () => {
        expect(
            articleMatchesJuvenileLawFilter('3', 'المبادئ والتأسيس (1–15)', 'الأهداف والسريان'),
        ).toBe(true);
        expect(
            articleMatchesJuvenileLawFilter('10', 'المبادئ والتأسيس (1–15)', 'الأهداف والسريان'),
        ).toBe(false);
        expect(
            articleMatchesJuvenileLawFilter('10', 'المبادئ والتأسيس (1–15)', 'دور ومدارس التأهيل'),
        ).toBe(true);
    });

    it('filters whole section when only main tab is selected', () => {
        expect(articleMatchesJuvenileLawFilter('72', 'التدابير والإصلاح (72–86)', null)).toBe(true);
        expect(articleMatchesJuvenileLawFilter('71', 'التدابير والإصلاح (72–86)', null)).toBe(false);
    });

    it('handles single-article sub range', () => {
        expect(
            articleMatchesJuvenileLawFilter('72', 'التدابير والإصلاح (72–86)', 'تدابير المخالفات'),
        ).toBe(true);
        expect(
            articleMatchesJuvenileLawFilter('73', 'التدابير والإصلاح (72–86)', 'تدابير المخالفات'),
        ).toBe(false);
    });

    it('resolveJuvenileFilterArticleRange returns start/end for sub chip', () => {
        expect(
            resolveJuvenileFilterArticleRange('قضاء الأحداث (47–71)', 'إجراءات التحقيق'),
        ).toEqual({ start: 47, end: 53 });
    });

    it('filterJuvenileLawArticles filters local cache list', () => {
        const articles = [
            { articleNumber: '1' },
            { articleNumber: '16' },
            { articleNumber: 'المادة 20' },
        ];
        const out = filterJuvenileLawArticles(
            articles,
            'الحماية والضم (16–46)',
            'الاكتشاف المبكر والشرطة',
        );
        expect(out.map((a) => a.articleNumber)).toEqual(['16', 'المادة 20']);
    });
});
