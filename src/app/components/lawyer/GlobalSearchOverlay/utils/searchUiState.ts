import type { GroupedSearchResults } from '@/app/services/globalSearchIndex';

/** حالة موحّدة للبحث — مصدر واحد لمؤشر التحميل في الجسم */
export type GlobalSearchUiState = 'idle' | 'loading' | 'empty' | 'results';

export function resolveGlobalSearchUiState(input: {
    query: string;
    debouncedQuery: string;
    isLoadingIndex: boolean;
    results: GroupedSearchResults | null;
}): GlobalSearchUiState {
    const trimmed = input.query.trim();
    if (!trimmed) return 'idle';

    const debouncedTrimmed = input.debouncedQuery.trim();
    const queryPending = trimmed !== debouncedTrimmed;
    const indexPending = input.isLoadingIndex && !input.results;

    if (queryPending || indexPending) return 'loading';
    if (!input.results || !input.results.hasResults) return 'empty';
    return 'results';
}

export function isGlobalSearchUiLoading(state: GlobalSearchUiState): boolean {
    return state === 'loading';
}
