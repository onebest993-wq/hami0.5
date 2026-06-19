import { useState, useEffect, useMemo, useCallback } from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { GlobalSearchNavigate, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { useSearchExtras } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchExtras';
import { useSearchIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchIndex';
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
    overlayOpen?: boolean;
}

export interface UseGlobalSearchReturn {
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    debouncedQuery: string;
    isSearching: boolean;
    isLoadingIndex: boolean;
    results: GroupedSearchResults | null;
    recentSearches: string[];
    handleResultClick: (navigate: GlobalSearchNavigate, label: string) => void;
    clearRecent: () => void;
    reloadExtras: () => void;
    pinLookup: WorkspacePinLookupContext;
    criminalCases: unknown[];
}

const RECENT_SEARCHES_KEY = 'lawyer_recent_searches';
const MAX_RECENT = 8;

export function useGlobalSearch(
    onClose: () => void,
    onNavigate: (navigate: GlobalSearchNavigate) => void,
    options: UseGlobalSearchOptions,
): UseGlobalSearchReturn {
    const criminalCases = options.criminalCases ?? [];

    const { extras, profileLine, isLoadingExtras, reloadExtras } = useSearchExtras({
        userId: options.userId,
        overlayOpen: options.overlayOpen,
    });

    const { fuse, isBuildingIndex } = useSearchIndex({
        files: options.files,
        executionFiles: options.executionFiles,
        globalNotes: options.globalNotes,
        notifications: options.notifications,
        criminalCases,
        userId: options.userId,
        profileLine,
        extras,
        isLoadingExtras,
        indexVersion: options.indexVersion,
    });

    const isLoadingIndex = isLoadingExtras || isBuildingIndex || !fuse;

    const { query, setQuery, debouncedQuery, isSearching, results } = useSearchQuery(
        options.initialQuery ?? '',
        fuse,
        isLoadingIndex,
    );

    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const saved = SecureStoreService.getItemSync(RECENT_SEARCHES_KEY);
        if (!saved) return;
        try {
            const parsed: unknown = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                setRecentSearches(parsed.filter((x): x is string => typeof x === 'string'));
            }
        } catch {
            SecureStoreService.deleteItemSync(RECENT_SEARCHES_KEY);
        }
    }, []);

    const handleResultClick = useCallback(
        (navigate: GlobalSearchNavigate, label: string) => {
            const newRecent = [label, ...recentSearches.filter((s) => s !== label)].slice(0, MAX_RECENT);
            setRecentSearches(newRecent);
            SecureStoreService.setItemSync(RECENT_SEARCHES_KEY, JSON.stringify(newRecent));
            onNavigate(navigate);
            onClose();
        },
        [recentSearches, onClose, onNavigate],
    );

    const clearRecent = useCallback(() => {
        setRecentSearches([]);
        SecureStoreService.deleteItemSync(RECENT_SEARCHES_KEY);
    }, []);

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
        debouncedQuery,
        isSearching,
        isLoadingIndex,
        results,
        recentSearches,
        handleResultClick,
        clearRecent,
        reloadExtras,
        pinLookup,
        criminalCases,
    };
}
