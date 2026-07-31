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
import {
    exactScanGlobalSearchHits,
    getGlobalSearchFuseDocs,
    mergeSearchHitLists,
    rankGlobalSearchHits,
} from '@/app/services/globalSearchFuse';
import {
    peekGlobalSearchDraftQuery,
    takeGlobalSearchDraftQuery,
} from '@/app/runtime/globalSearchDraftQuery';

export interface UseSearchQueryReturn {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    debouncedQuery: string;
    isSearching: boolean;
    results: GroupedSearchResults | null;
}

function isQuerySearchable(q: string): boolean {
    const trimmed = q.trim();
    if (!trimmed) return false;
    if (/\d/u.test(trimmed)) return true;
    return trimmed.replace(/\s+/gu, '').length >= PERFORMANCE.MIN_SEARCH_LENGTH;
}

function resolveSearchSeed(initialQuery: string): string {
    const trimmed = initialQuery.trim();
    if (trimmed) return clampGlobalSearchQuery(initialQuery);
    return clampGlobalSearchQuery(peekGlobalSearchDraftQuery());
}

export function useSearchQuery(
    initialQuery: string,
    fuse: Fuse<GlobalSearchEntry> | null,
    isLoadingIndex: boolean,
    searchSessionKey: number,
): UseSearchQueryReturn {
    const [query, setQueryState] = useState(() => resolveSearchSeed(initialQuery));
    const [debouncedQuery, setDebouncedQuery] = useState('');

    const setQuery = useCallback((value: React.SetStateAction<string>) => {
        setQueryState((prev) => {
            const next = typeof value === 'function' ? value(prev) : value;
            return clampGlobalSearchQuery(next);
        });
    }, []);

    useEffect(() => {
        const trimmed = initialQuery.trim();
        const seed = trimmed
            ? clampGlobalSearchQuery(initialQuery)
            : clampGlobalSearchQuery(takeGlobalSearchDraftQuery());
        setQueryState(seed);
        setDebouncedQuery('');
    }, [initialQuery, searchSessionKey]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), TIMING.SEARCH_DEBOUNCE);
        return () => clearTimeout(timer);
    }, [query]);

    const results = useMemo<GroupedSearchResults | null>(() => {
        const q = debouncedQuery.trim();
        if (!q || isLoadingIndex || !fuse) return null;
        if (!isQuerySearchable(q)) return groupSearchResults([]);

        const raw = fuse.search(normalizeArabic(q));
        let ranked = rankGlobalSearchHits(q, raw, PERFORMANCE.MAX_SEARCH_RESULTS);

        const docs = getGlobalSearchFuseDocs(fuse);
        if (docs && ranked.length < Math.min(12, PERFORMANCE.MAX_SEARCH_RESULTS)) {
            const exact = exactScanGlobalSearchHits(q, docs, PERFORMANCE.MAX_SEARCH_RESULTS);
            ranked = mergeSearchHitLists(ranked, exact, PERFORMANCE.MAX_SEARCH_RESULTS);
        }

        return groupSearchResults(ranked);
    }, [debouncedQuery, fuse, isLoadingIndex]);

    const isSearching = Boolean(query.trim() && query.trim() !== debouncedQuery.trim());

    return { query, setQuery, debouncedQuery, isSearching, results };
}
