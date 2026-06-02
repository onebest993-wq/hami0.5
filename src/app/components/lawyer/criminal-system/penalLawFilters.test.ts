import { describe, expect, it } from 'vitest';
import {
    articleMatchesPenalLawFilter,
    filterPenalLawArticles,
    PENAL_LAW_FILTERS,
    resolvePenalFilterArticleRange,
} from './penalLawFilters';

describe('penalLawFilters', () => {
    it('defines nine main groups covering articles 1–506', () => {
        expect(Object.keys(PENAL_LAW_FILTERS)).toHaveLength(9);
        expect(PENAL_LAW_FILTERS['المبادئ العامة (1–100)'].range).toEqual([1, 100]);
        expect(PENAL_LAW_FILTERS['المخالفات (487–506)'].range).toEqual([487, 506]);
        expect(PENAL_LAW_FILTERS['الدولة والسلطات (101–232)'].range).toEqual([101, 232]);
        expect(PENAL_LAW_FILTERS['العدالة (233–273)'].range).toEqual([233, 273]);
    });

    it('filters by sub-chip range within general principles', () => {
        expect(
            articleMatchesPenalLawFilter('3', 'المبادئ العامة (1–100)', 'الشرعية'),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('10', 'المبادئ العامة (1–100)', 'الشرعية'),
        ).toBe(false);
        expect(
            articleMatchesPenalLawFilter('10', 'المبادئ العامة (1–100)', 'الاختصاص'),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('20', 'المبادئ العامة (1–100)', 'أنواع الجرائم'),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('28', 'المبادئ العامة (1–100)', 'الركن المادي'),
        ).toBe(true);
    });

    it('filters whole section when only main group is selected', () => {
        expect(articleMatchesPenalLawFilter('120', 'الدولة والسلطات (101–232)', null)).toBe(true);
        expect(articleMatchesPenalLawFilter('100', 'الدولة والسلطات (101–232)', null)).toBe(false);
        expect(articleMatchesPenalLawFilter('272', 'العدالة (233–273)', null)).toBe(true);
        expect(articleMatchesPenalLawFilter('232', 'العدالة (233–273)', null)).toBe(false);
        expect(articleMatchesPenalLawFilter('250', 'العدالة (233–273)', 'تضليل القضاء')).toBe(true);
    });

    it('handles single-article sub range', () => {
        expect(
            articleMatchesPenalLawFilter('383', 'الأسرة والأخلاق (376–404)', 'التعريض للخطر'),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('384', 'الأسرة والأخلاق (376–404)', 'التعريض للخطر'),
        ).toBe(false);
    });

    it('maps article 483 to امتناع عن النفقة under property crimes', () => {
        expect(
            articleMatchesPenalLawFilter('483', 'جرائم الأموال (428–486)', null),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('483', 'جرائم الأموال (428–486)', 'امتناع عن النفقة'),
        ).toBe(true);
        expect(
            articleMatchesPenalLawFilter('483', 'جرائم الأموال (428–486)', 'التخريب'),
        ).toBe(false);
    });

    it('resolvePenalFilterArticleRange returns start/end for sub chip', () => {
        expect(
            resolvePenalFilterArticleRange('العدالة (233–273)', 'شهادة الزور'),
        ).toEqual({ start: 251, end: 257 });
        expect(
            resolvePenalFilterArticleRange('التزوير والفساد (274–341)', 'تزوير الأختام'),
        ).toEqual({ start: 274, end: 279 });
    });

    it('filterPenalLawArticles filters local cache list', () => {
        const articles = [
            { articleNumber: '1' },
            { articleNumber: '101' },
            { articleNumber: 'المادة 160' },
        ];
        const out = filterPenalLawArticles(articles, 'الدولة والسلطات (101–232)', 'التمرد');
        expect(out.map((a) => a.articleNumber)).toEqual(['المادة 160']);
    });
});
