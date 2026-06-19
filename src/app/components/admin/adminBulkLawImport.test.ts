import { describe, expect, it } from 'vitest';
import {
    parseBulkLawJsonInput,
    unwrapBulkLawJsonRows,
} from './adminBulkLawImport';

describe('unwrapBulkLawJsonRows', () => {
    it('accepts flat array', () => {
        expect(unwrapBulkLawJsonRows([{ المادة: 1, النص: 'أ' }])).toHaveLength(1);
    });

    it('accepts bundle articles wrapper', () => {
        const rows = unwrapBulkLawJsonRows({
            schemaVersion: 1,
            law_name: 'قانون',
            articles: [
                { article_number: '1', content: 'أ' },
                { article_number: '2', content: 'ب' },
            ],
        });
        expect(rows).toHaveLength(2);
    });

    it('accepts article map object', () => {
        const rows = unwrapBulkLawJsonRows({
            '1': 'نص 1',
            '2': 'نص 2',
        });
        expect(rows).toHaveLength(2);
    });

    it('accepts articles as object map inside bundle', () => {
        const rows = unwrapBulkLawJsonRows({
            schemaVersion: 1,
            law_name: 'قانون',
            articles: {
                '1': 'نص 1',
                '2': 'نص 2',
            },
        });
        expect(rows).toHaveLength(2);
    });

    it('accepts nested data.articles', () => {
        const rows = unwrapBulkLawJsonRows({
            data: {
                articles: [{ المادة: 1, النص: 'أ' }],
            },
        });
        expect(rows).toHaveLength(1);
    });
});

describe('parseBulkLawJsonInput', () => {
    it('counts raw rows separately from valid items', () => {
        const result = parseBulkLawJsonInput(
            [
                { المادة: 1, النص: 'صالح' },
                { المادة: 2 },
                { article_number: '3', content: 'صالح أيضاً' },
            ],
            'قانون الأحوال الشخصية رقم 188 لسنة 1959',
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.rawCount).toBe(3);
        expect(result.items).toHaveLength(2);
        expect(result.skipped).toHaveLength(1);
    });

    it('unwraps bundle with 94 articles', () => {
        const articles = Array.from({ length: 94 }, (_, i) => ({
            article_number: String(i + 1),
            content: `نص ${i + 1}`,
        }));
        const result = parseBulkLawJsonInput(
            { schemaVersion: 1, law_name: 'قانون', articles },
            'قانون الأحوال الشخصية رقم 188 لسنة 1959',
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.rawCount).toBe(94);
        expect(result.items).toHaveLength(94);
    });

    it('accepts نص المادة field alias', () => {
        const result = parseBulkLawJsonInput(
            [{ المادة: 5, 'نص المادة': 'محتوى المادة الخامسة' }],
            'قانون الأحوال الشخصية رقم 188 لسنة 1959',
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.article_number).toBe('5');
    });
});
