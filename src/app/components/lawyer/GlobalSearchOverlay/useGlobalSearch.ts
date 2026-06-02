import { useState, useEffect, useMemo, useCallback } from 'react';
import type Fuse from 'fuse.js';
import { useCaseStore } from '@/app/stores/caseStore';
import { useCriminalStore } from '@/app/components/lawyer/criminal-system/criminalStore';
import { ProfileDB } from '@/app/services/lawyer-cloud';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import SecureStoreService from '@/app/services/SecureStoreService';
import { TIMING, PERFORMANCE } from '@/app/utils/constants';
import { NOTES_VAULT_CHANGED } from '@/app/services/notesSyncBridge';
import {
    buildGlobalSearchIndex,
    groupSearchResults,
    type GlobalSearchNavigate,
    type GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { loadGlobalSearchExtras } from '@/app/services/globalSearchLoad';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';

export type { GlobalSearchNavigate, GroupedSearchResults };

export interface UseGlobalSearchOptions {
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
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

export const useGlobalSearch = (
    onClose: () => void,
    onNavigate: (navigate: GlobalSearchNavigate) => void,
    options: UseGlobalSearchOptions,
): UseGlobalSearchReturn => {
    const [query, setQuery] = useState(options.initialQuery ?? '');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [extrasVersion, setExtrasVersion] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [profileLine, setProfileLine] = useState('');
    const [extras, setExtras] = useState<Awaited<ReturnType<typeof loadGlobalSearchExtras>> | null>(null);
    const [isLoadingIndex, setIsLoadingIndex] = useState(true);
    const [fuse, setFuse] = useState<Fuse<ReturnType<typeof buildGlobalSearchIndex>[number]> | null>(null);

    const cases = useCaseStore((s) => s.cases);
    const criminalCases = useCriminalStore((s) =>
        Object.values(s.casesById ?? {}).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    );

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

    useEffect(() => {
        setQuery(options.initialQuery ?? '');
    }, [options.initialQuery]);

    useEffect(() => {
        let cancelled = false;
        setIsLoadingIndex(true);
        const uid = options.userId;

        void (async () => {
            try {
                const [loadedExtras, profile] = await Promise.all([
                    loadGlobalSearchExtras(uid),
                    uid ? ProfileDB.getProfile(uid).catch(() => null) : Promise.resolve(null),
                ]);
                if (cancelled) return;
                setExtras(loadedExtras);
                if (profile) {
                    const line = [profile.header.name, profile.header.title, profile.header.workplace, profile.header.specialization, profile.header.city]
                        .filter(Boolean)
                        .join(' — ');
                    setProfileLine(line);
                }
            } finally {
                if (!cancelled) setIsLoadingIndex(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [options.userId, extrasVersion]);

    useEffect(() => {
        const onVault = () => setExtrasVersion((v) => v + 1);
        window.addEventListener(NOTES_VAULT_CHANGED, onVault);
        return () => window.removeEventListener(NOTES_VAULT_CHANGED, onVault);
    }, []);

    useEffect(() => {
        if (!options.overlayOpen) return;
        const onFocus = () => setExtrasVersion((v) => v + 1);
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [options.overlayOpen]);

    const reloadExtras = useCallback(() => setExtrasVersion((v) => v + 1), []);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), TIMING.SEARCH_DEBOUNCE);
        return () => clearTimeout(timer);
    }, [query]);

    const index = useMemo(
        () =>
            buildGlobalSearchIndex({
                files: options.files,
                executionFiles: options.executionFiles,
                globalNotes: options.globalNotes,
                cases,
                criminalCases,
                profileLine,
                userId: options.userId,
                notifications: options.notifications,
                extras: extras ?? undefined,
            }),
        [
            options.files,
            options.executionFiles,
            options.globalNotes,
            options.notifications,
            cases,
            criminalCases,
            profileLine,
            options.userId,
            extras,
            options.indexVersion,
        ],
    );

    useEffect(() => {
        let cancelled = false;
        setFuse(null);
        if (isLoadingIndex) return;
        import('fuse.js').then((mod) => {
            if (cancelled) return;
            const FuseCtor = mod.default;
            setFuse(
                new FuseCtor(index, {
                    keys: [
                        { name: 'title', weight: 2.5 },
                        { name: 'subtitle', weight: 1.5 },
                        { name: '_searchStr', weight: 1.2 },
                        { name: 'snippet', weight: 0.8 },
                    ],
                    threshold: PERFORMANCE.FUSE_THRESHOLD,
                    ignoreLocation: true,
                    minMatchCharLength: 1,
                }),
            );
        });
        return () => {
            cancelled = true;
        };
    }, [index, isLoadingIndex]);

    const results = useMemo<GroupedSearchResults | null>(() => {
        const q = debouncedQuery.trim();
        if (!q || isLoadingIndex || !fuse) return null;
        const hits = fuse
            .search(normalizeArabic(q))
            .slice(0, PERFORMANCE.MAX_SEARCH_RESULTS)
            .map((r) => r.item);
        return groupSearchResults(hits);
    }, [debouncedQuery, fuse, isLoadingIndex]);

    const isSearching =
        Boolean(query.trim() && query.trim() !== debouncedQuery.trim()) || (Boolean(query.trim()) && isLoadingIndex);

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
};
