// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    decorateLawArticlesInPlainText,
    LAW_ARTICLE_REGEX,
    resolveDefaultSmartLawId,
    stripStoredLawTipAttributes,
} from '@/app/services/dossier-notes/smartLawLinker';

describe('smartLawLinker', () => {
    it('matches Arabic law article patterns', () => {
        const samples = ['المادة 32', 'مادة 32', 'م 32', 'المادة (32)'];
        for (const sample of samples) {
            LAW_ARTICLE_REGEX.lastIndex = 0;
            const m = LAW_ARTICLE_REGEX.exec(sample);
            expect(m?.[1]).toBe('32');
        }
    });

    it('maps execution context to execution law id', () => {
        expect(resolveDefaultSmartLawId({ kind: 'execution' })).toBe('execution');
    });

    it('maps criminal lawsuit to penal code', () => {
        expect(resolveDefaultSmartLawId({ kind: 'lawsuit', lawsuitType: 'criminal' })).toBe('penal');
    });

    it('maps civil lawsuit to civil procedure', () => {
        expect(resolveDefaultSmartLawId({ kind: 'lawsuit', lawsuitType: 'civil' })).toBe('civil_procedure');
    });

    it('stores reference only without inline tip text', () => {
        const html = decorateLawArticlesInPlainText('راجع م 32', { kind: 'execution' });
        expect(html).toContain('data-law-id="execution"');
        expect(html).toContain('data-law-article="32"');
        expect(html).not.toContain('data-law-tip');
    });

    it('does not decorate repository notes with smart law links', () => {
        const html = decorateLawArticlesInPlainText('راجع م 32', { kind: 'repository' });
        expect(html).toBe('راجع م 32');
        expect(html).not.toContain('data-law-article');
    });

    it('strips legacy data-law-tip before save', () => {
        const cleaned = stripStoredLawTipAttributes(
            '<span data-law-article="1" data-law-tip="نص طويل">م 1</span>',
        );
        expect(cleaned).not.toContain('data-law-tip');
        expect(cleaned).toContain('data-law-article="1"');
    });
});
