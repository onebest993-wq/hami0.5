import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useGlobalSearch } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearch';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { useGlobalSearchOverlayChrome } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayChrome';
import { useSearchScanIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchScanIndex';
import { isGlobalSearchUiLoading } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchUiState';
import type {
    GlobalSearchOverlayShellContentProps,
    GlobalSearchOverlayShellProps,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import {
    filterGroupedResultsByScope,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

export function useGlobalSearchOverlayShell(props: GlobalSearchOverlayProps): {
    mounted: boolean;
    shellProps: GlobalSearchOverlayShellProps;
} {
    const {
        open = true,
        keepWarm = false,
        onExitComplete,
        onClose,
        onNavigate,
        files,
        executionFiles,
        globalNotes,
        notifications,
        criminalCases = [],
        userId,
        initialQuery = '',
        searchSessionKey = 0,
        headless = false,
        onShellContent,
        shellOverlayRef,
        shellInputRef,
        focusArmed = true,
    } = props;

    const [searchScope, setSearchScope] = useState<GlobalSearchScopeId>('all');

    useEffect(() => {
        if (!open) setSearchScope('all');
    }, [open]);

    const {
        query,
        setQuery,
        isEnrichingIndex,
        searchUiState,
        results,
        recentSearches,
        handleResultClick,
        clearRecent,
        pinLookup,
    } = useGlobalSearch(onNavigate, {
        files,
        executionFiles,
        globalNotes,
        notifications,
        criminalCases,
        userId,
        initialQuery,
        searchSessionKey,
        overlayOpen: open,
    });

    const showEmptyState = !query.trim();

    const scopedResults = useMemo(
        () => filterGroupedResultsByScope(results, searchScope),
        [results, searchScope],
    );

    const {
        overlayRef,
        inputRef,
        activeIndex,
        setActiveIndex,
        flatResults,
        pick,
        onKeyDownCapture,
        keyboardInset,
    } = useGlobalSearchOverlayChrome(open, scopedResults, handleResultClick, {
        overlayRef: shellOverlayRef,
        inputRef: shellInputRef,
        keyboardInsetEnabled: open,
    });

    const scanIndexForPreview = useSearchScanIndex(
        files,
        executionFiles,
        criminalCases,
        pinLookup,
        Boolean(open && scopedResults?.hasResults),
    );

    const headerBusy = isGlobalSearchUiLoading(searchUiState);

    const shellContent = useMemo<GlobalSearchOverlayShellContentProps>(
        () => ({
            onKeyDownCapture,
            keyboardInset,
            query,
            setQuery,
            showEmptyState,
            headerBusy,
            isEnrichingIndex,
            recentSearches,
            clearRecent,
            searchUiState,
            results: scopedResults,
            flatResults,
            pick,
            pinLookup,
            scanIndexForPreview,
            activeIndex,
            setActiveIndex,
            searchScope,
            onSearchScopeChange: setSearchScope,
        }),
        [
            onKeyDownCapture,
            keyboardInset,
            query,
            setQuery,
            showEmptyState,
            headerBusy,
            isEnrichingIndex,
            recentSearches,
            clearRecent,
            searchUiState,
            scopedResults,
            flatResults,
            pick,
            pinLookup,
            scanIndexForPreview,
            activeIndex,
            setActiveIndex,
            searchScope,
        ],
    );

    useLayoutEffect(() => {
        if (!headless || !onShellContent) return;
        onShellContent(shellContent);
    }, [headless, onShellContent, shellContent]);

    return {
        mounted: open || keepWarm,
        shellProps: {
            open,
            keepWarm,
            onExitComplete,
            onClose,
            overlayRef,
            inputRef,
            focusArmed,
            ...shellContent,
        },
    };
}
