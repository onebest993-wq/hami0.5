import { describe, expect, it } from 'vitest';
import {
    isGlobalSearchUiLoading,
    resolveGlobalSearchUiState,
} from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchUiState';
import { groupSearchResults } from '@/app/services/globalSearchIndex';

describe('searchUiState', () => {
    it('idle عندما الحقل فارغ', () => {
        expect(
            resolveGlobalSearchUiState({
                query: '',
                debouncedQuery: '',
                isLoadingIndex: false,
                results: null,
            }),
        ).toBe('idle');
    });

    it('loading أثناء debounce أو بناء الفهرس', () => {
        expect(
            resolveGlobalSearchUiState({
                query: 'دعوى',
                debouncedQuery: '',
                isLoadingIndex: false,
                results: null,
            }),
        ).toBe('loading');

        expect(
            resolveGlobalSearchUiState({
                query: 'دعوى',
                debouncedQuery: 'دعوى',
                isLoadingIndex: true,
                results: null,
            }),
        ).toBe('loading');
    });

    it('empty و results حسب hasResults', () => {
        const empty = groupSearchResults([]);
        expect(
            resolveGlobalSearchUiState({
                query: 'دعوى',
                debouncedQuery: 'دعوى',
                isLoadingIndex: false,
                results: empty,
            }),
        ).toBe('empty');

        const withHits = groupSearchResults([
            {
                id: '1',
                category: 'lawsuit',
                title: 'ملف',
                subtitle: '',
                lifecycle: 'active',
                _searchStr: 'ملف',
                navigate: { type: 'lawsuit', fileId: '1' },
            },
        ]);
        expect(
            resolveGlobalSearchUiState({
                query: 'ملف',
                debouncedQuery: 'ملف',
                isLoadingIndex: false,
                results: withHits,
            }),
        ).toBe('results');
    });

    it('isGlobalSearchUiLoading', () => {
        expect(isGlobalSearchUiLoading('loading')).toBe(true);
        expect(isGlobalSearchUiLoading('results')).toBe(false);
    });
});
