import { useState, useEffect, useMemo, useCallback } from 'react';
import type Fuse from 'fuse.js';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import { TIMING, PERFORMANCE } from '@/app/utils/constants';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import {
    groupSearchResults,
    type GlobalSearchEntry,
    type GroupedSearchResults,
} from '@/app/services/globalSearchIndex';

export interface UseSearchQueryReturn {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    debouncedQuery: string;
    isSearching: boolean;
    results: GroupedSearchResults | null;
}

export function useSearchQuery(
    initialQuery: string,
    fuse: Fuse<GlobalSearchEntry> | null,
    isLoadingIndex: boolean,
    searchSessionKey: number,
): UseSearchQueryReturn {
    const [query, setQueryState] = useState(() => clampGlobalSearchQuery(initialQuery));
    const [debouncedQuery, setDebouncedQuery] = useState('');

    const setQuery = useCallback((value: React.SetStateAction<string>) => {
        setQueryState((prev) => {
            const next = typeof value === 'function' ? value(prev) : value;
            return clampGlobalSearchQuery(next);
        });
    }, []);

    useEffect(() => {
        setQueryState(clampGlobalSearchQuery(initialQuery));
        setDebouncedQuery('');
    }, [initialQuery, searchSessionKey]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), TIMING.SEARCH_DEBOUNCE);
        return () => clearTimeout(timer);
    }, [query]);

    const results = useMemo<GroupedSearchResults | null>(() => {
        const q = debouncedQuery.trim();
        if (!q || isLoadingIndex || !fuse) return null;
        const hits = fuse
            .search(normalizeArabic(q))
            .slice(0, PERFORMANCE.MAX_SEARCH_RESULTS)
            .map((r) => r.item)
            .filter((entry) => entry.lifecycle !== 'deleted');
        return groupSearchResults(hits);
    }, [debouncedQuery, fuse, isLoadingIndex]);

    const isSearching = Boolean(query.trim() && query.trim() !== debouncedQuery.trim());

    return { query, setQuery, debouncedQuery, isSearching, results };
}
