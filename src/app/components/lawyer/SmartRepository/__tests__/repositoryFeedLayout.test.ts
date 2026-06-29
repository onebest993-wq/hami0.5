import { describe, expect, it } from 'vitest';
import {
    getRepositoryFeedContainerClass,
    resolveRepositoryCardVariant,
    resolveRepositoryCardInnerLayout,
} from '../repositoryFeedLayout';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';

describe('repositoryFeedLayout', () => {
    it('maps list layout to row inner layout', () => {
        expect(resolveRepositoryCardInnerLayout('list')).toBe('row');
        expect(resolveRepositoryCardInnerLayout('grid')).toBe('stack');
    });

    it('resolves card variant by item kind', () => {
        const dossier: RepositoryFeedItem = {
            kind: 'dossier',
            ref: {
                id: 'x',
                title: 't',
                dossierKind: 'lawsuit',
                dossierLabel: 'd',
                date: '2026-01-01',
            },
            body: 'body',
        };
        expect(resolveRepositoryCardVariant(dossier)).toBe('dossier');
    });

    it('exposes container classes for gallery', () => {
        expect(getRepositoryFeedContainerClass('gallery')).toContain('columns-');
    });
});
