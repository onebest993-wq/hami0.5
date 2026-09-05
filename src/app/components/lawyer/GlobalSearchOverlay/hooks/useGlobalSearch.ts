import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clampRecentSearchLabel,
    globalSearchRecentStorageKey,
    pushGlobalSearchRecentLabel,
} from '@/app/services/search/globalSearchQuerySecurity';
import {
    hydrateGlobalSearchRecentSearches,
    readGlobalSearchRecentSearchesSync,
} from '@/app/services/search/readGlobalSearchRecentSearchesSync';
import type { GlobalSearchNavigate, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useGlobalSearchRuntime } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider';
import { useSearchQuery } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery';
import type { GlobalSearchUiState } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchUiState';

interface UseGlobalSearchOptions {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases?: unknown[];
    userId: string | null;
    initialQuery?: string;
    searchSessionKey?: number;
    overlayOpen?: boolean;
}

interface UseGlobalSearchReturn {
    query: string;
    setQuery: (value: string) => void;
    isEnrichingIndex: boolean;
    searchUiState: GlobalSearchUiState;
    results: GroupedSearchResults | null;
    recentSearches: string[];
    handleResultClick: (navigate: GlobalSearchNavigate, label: string) => void;
    clearRecent: () => void;
    pinLookup: WorkspacePinLookupContext;
}

export function useGlobalSearch(
    onNavigate: (navigate: GlobalSearchNavigate) => void,
    options: UseGlobalSearchOptions,
): UseGlobalSearchReturn {
    const overlayOpen = options.overlayOpen !== false;
    const criminalCases = options.criminalCases ?? [];
    const { fuse, extras, isLoadingIndex, isEnrichingIndex } = useGlobalSearchRuntime();

    const { query, setQuery, searchUiState, results } = useSearchQuery(
        options.initialQuery ?? '',
        fuse,
        isLoadingIndex,
        options.searchSessionKey ?? 0,
    );

    const recentStorageKey = globalSearchRecentStorageKey(options.userId);
    const [recentSearches, setRecentSearches] = useState<string[]>(() =>
        readGlobalSearchRecentSearchesSync(options.userId),
    );
    const recentSearchesRef = useRef(recentSearches);
    recentSearchesRef.current = recentSearches;

    useEffect(() => {
        if (!overlayOpen) return;
        if (!recentStorageKey) {
            setRecentSearches([]);
            return;
        }
        let cancelled = false;
        const sync = readGlobalSearchRecentSearchesSync(options.userId);
        if (sync.length > 0) {
            setRecentSearches(sync);
        }
        void hydrateGlobalSearchRecentSearches(options.userId).then((hydrated) => {
            if (!cancelled) setRecentSearches(hydrated);
        });
        return () => {
            cancelled = true;
        };
    }, [overlayOpen, recentStorageKey, options.userId]);

    const handleResultClick = useCallback(
        (navigate: GlobalSearchNavigate, label: string) => {
            const safeLabel = clampRecentSearchLabel(label);
            if (safeLabel) {
                const next = pushGlobalSearchRecentLabel(recentSearchesRef.current, safeLabel);
                recentSearchesRef.current = next;
                setRecentSearches(next);
                if (recentStorageKey) {
                    void SecureStoreService.setItem(recentStorageKey, JSON.stringify(next));
                }
            }
            onNavigate(navigate);
        },
        [onNavigate, recentStorageKey],
    );

    const clearRecent = useCallback(() => {
        setRecentSearches([]);
        if (recentStorageKey) {
            void SecureStoreService.deleteItem(recentStorageKey);
        }
    }, [recentStorageKey]);

    const pinLookup = useMemo<WorkspacePinLookupContext>(
        () => ({
            files: options.files,
            executionFiles: options.executionFiles ?? [],
            lawsuitFiles: options.files,
            notes: options.globalNotes,
            tasks: extras?.quantumTasks ?? [],
            urgentCases: extras?.urgentCases ?? [],
            criminalCases,
            threadingTransactions: extras?.threadingTransactions ?? [],
        }),
        [options.files, options.executionFiles, options.globalNotes, extras, criminalCases],
    );

    return {
        query,
        setQuery,
        isEnrichingIndex,
        searchUiState,
        results,
        recentSearches,
        handleResultClick,
        clearRecent,
        pinLookup,
    };
}
