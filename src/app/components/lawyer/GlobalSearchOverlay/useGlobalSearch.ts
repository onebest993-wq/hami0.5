import { useState, useEffect, useMemo, useCallback } from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clampRecentSearchLabel,
    globalSearchRecentStorageKey,
    GLOBAL_SEARCH_MAX_RECENT_COUNT,
    sanitizeRecentSearchLabels,
} from '@/app/services/search/globalSearchQuerySecurity';
import type { GlobalSearchNavigate, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useGlobalSearchRuntime } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider';
import { useSearchQuery } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery';

export type { GlobalSearchNavigate, GroupedSearchResults };

export interface UseGlobalSearchOptions {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases?: unknown[];
    userId: string | null;
    initialQuery?: string;
    indexVersion?: number;
    searchSessionKey?: number;
}

export interface UseGlobalSearchReturn {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    isSearching: boolean;
    isLoadingIndex: boolean;
    isEnrichingIndex: boolean;
    results: GroupedSearchResults | null;
    recentSearches: string[];
    handleResultClick: (navigate: GlobalSearchNavigate, label: string) => void;
    clearRecent: () => void;
    pinLookup: WorkspacePinLookupContext;
}

const LEGACY_RECENT_SEARCHES_KEY = 'lawyer_recent_searches';

export function useGlobalSearch(
    onClose: () => void,
    onNavigate: (navigate: GlobalSearchNavigate) => void,
    options: UseGlobalSearchOptions,
): UseGlobalSearchReturn {
    const criminalCases = options.criminalCases ?? [];
    const { fuse, extras, isLoadingIndex, isEnrichingIndex } = useGlobalSearchRuntime();

    const { query, setQuery, isSearching, results } = useSearchQuery(
        options.initialQuery ?? '',
        fuse,
        isLoadingIndex,
        options.searchSessionKey ?? 0,
    );

    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const recentStorageKey = globalSearchRecentStorageKey(options.userId);

    useEffect(() => {
        if (!recentStorageKey) {
            setRecentSearches([]);
            return;
        }
        const saved = SecureStoreService.getItemSync(recentStorageKey);
        if (!saved) {
            const legacy = SecureStoreService.getItemSync(LEGACY_RECENT_SEARCHES_KEY);
            if (legacy) {
                try {
                    const migrated = sanitizeRecentSearchLabels(JSON.parse(legacy));
                    setRecentSearches(migrated);
                    if (migrated.length > 0) {
                        SecureStoreService.setItemSync(recentStorageKey, JSON.stringify(migrated));
                    }
                    SecureStoreService.deleteItemSync(LEGACY_RECENT_SEARCHES_KEY);
                } catch {
                    SecureStoreService.deleteItemSync(LEGACY_RECENT_SEARCHES_KEY);
                }
            }
            return;
        }
        try {
            const parsed: unknown = JSON.parse(saved);
            setRecentSearches(sanitizeRecentSearchLabels(parsed));
        } catch {
            SecureStoreService.deleteItemSync(recentStorageKey);
        }
    }, [recentStorageKey]);

    const handleResultClick = useCallback(
        (navigate: GlobalSearchNavigate, label: string) => {
            const safeLabel = clampRecentSearchLabel(label);
            if (!safeLabel) return;
            const newRecent = [safeLabel, ...recentSearches.filter((s) => s !== safeLabel)].slice(
                0,
                GLOBAL_SEARCH_MAX_RECENT_COUNT,
            );
            setRecentSearches(newRecent);
            if (recentStorageKey) {
                SecureStoreService.setItemSync(recentStorageKey, JSON.stringify(newRecent));
            }
            onNavigate(navigate);
            onClose();
        },
        [recentSearches, onClose, onNavigate, recentStorageKey],
    );

    const clearRecent = useCallback(() => {
        setRecentSearches([]);
        if (recentStorageKey) {
            SecureStoreService.deleteItemSync(recentStorageKey);
        }
    }, [recentStorageKey]);

    const pinLookup = useMemo<WorkspacePinLookupContext>(
        () => ({
            files: options.files,
            executionFiles: options.executionFiles ?? [],
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
        isSearching,
        isLoadingIndex,
        isEnrichingIndex,
        results,
        recentSearches,
        handleResultClick,
        clearRecent,
        pinLookup,
    };
}
