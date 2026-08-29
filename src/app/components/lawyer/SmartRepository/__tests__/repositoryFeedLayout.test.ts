import { describe, expect, it } from 'vitest';
import {
    getRepositoryFeedContainerClass,
    normalizeRepositoryFeedLayout,
    resolveRepositoryCardInnerLayout,
    resolveRepositoryCardVariant,
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

    it('يطبع التخطيطات القديمة إلى شبكة أو قائمة', () => {
        expect(normalizeRepositoryFeedLayout('compact')).toBe('grid');
        expect(normalizeRepositoryFeedLayout('timeline')).toBe('grid');
        expect(normalizeRepositoryFeedLayout('gallery')).toBe('grid');
        expect(normalizeRepositoryFeedLayout('list')).toBe('list');
        expect(getRepositoryFeedContainerClass('grid')).toContain('grid-cols-');
        expect(getRepositoryFeedContainerClass('list')).toContain('flex flex-col');
        expect(getRepositoryFeedContainerClass('grid')).not.toContain('columns-');
    });
});
