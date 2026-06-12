import { describe, expect, it } from 'vitest';
import type { ExecutionLawArticle } from '@/data/executionLaws';
import {
    isArabicLooseHighlightMatch,
    mergeLocalTitlesIntoExecutionArticles,
    splitTextByArabicLooseHighlight,
} from '@/app/utils/executionLawArticleUtils';
import { mapRemoteRowsToExecutionArticles } from '@/app/utils/executionLawRemoteCache';

describe('executionLawArticleUtils', () => {
    it('merges local titles when remote rows omit them', () => {
        const remote: ExecutionLawArticle[] = [
            {
                number: 20,
                title: '',
                content: 'نص من القاعدة',
                parentId: 'instruments_prelude',
                leafId: 'voluntary_execution_notice',
                leafLabel: 'التنفيذ الرضائي والإخبارية',
            },
        ];
        const local: ExecutionLawArticle[] = [
            {
                number: 20,
                title: 'الإخبار بالتنفيذ',
                content: 'نص محلي',
                parentId: 'instruments_prelude',
                leafId: 'voluntary_execution_notice',
                leafLabel: 'التنفيذ الرضائي والإخبارية',
            },
        ];
        const merged = mergeLocalTitlesIntoExecutionArticles(remote, local);
        expect(merged[0].title).toBe('الإخبار بالتنفيذ');
        expect(merged[0].content).toBe('نص من القاعدة');
    });

    it('highlights repeated tokens consistently', () => {
        const parts = splitTextByArabicLooseHighlight('حجز حجز', 'حجز');
        expect(parts.filter(Boolean).length).toBeGreaterThan(1);
        expect(parts.every((part) => !part || isArabicLooseHighlightMatch(part, 'حجز') || part === ' ')).toBe(
            true
        );
    });
});

describe('mapRemoteRowsToExecutionArticles', () => {
    it('deduplicates rows and keeps the longest content', () => {
        const rows = mapRemoteRowsToExecutionArticles([
            {
                law_name: 'قانون التنفيذ العراقي رقم 45 لسنة 1980',
                article_number: 'المادة 30',
                content: 'قصير',
            },
            {
                law_name: 'قانون التنفيذ العراقي رقم 45 لسنة 1980',
                article_number: '30',
                content: 'نص أطول للمادة الثلاثين',
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0].number).toBe(30);
        expect(rows[0].content).toBe('نص أطول للمادة الثلاثين');
    });
});
