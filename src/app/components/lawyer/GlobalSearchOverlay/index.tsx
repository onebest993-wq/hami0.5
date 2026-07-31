import React, { useEffect, useMemo, useState } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useGlobalSearch } from '@/app/components/lawyer/GlobalSearchOverlay/useGlobalSearch';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchErrorBoundary } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchErrorBoundary';
import { useGlobalSearchOverlayChrome } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayChrome';
import { useSearchScanIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchScanIndex';
import { GlobalSearchRuntimeProvider } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider';
import { isSearchHeaderBusy } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchHeaderBusy';
import { useGlobalSearchLifecycle } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchLifecycle';
import { GlobalSearchOverlayStaticShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell';
import {
    filterGroupedResultsByScope,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

export type { GlobalSearchOverlayProps, GlobalSearchNavigate } from '@/app/components/lawyer/GlobalSearchOverlay/types';

function GlobalSearchOverlayInner({
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
    indexVersion = 0,
    searchSessionKey = 0,
}: GlobalSearchOverlayProps) {
    useBodyScrollLock(open);
    useGlobalSearchLifecycle(open);

    const [searchScope, setSearchScope] = useState<GlobalSearchScopeId>('all');

    useEffect(() => {
        if (!open) setSearchScope('all');
    }, [open]);

    const {
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
    } = useGlobalSearch(onClose, onNavigate, {
        files,
        executionFiles,
        globalNotes,
        notifications,
        criminalCases,
        userId,
        initialQuery,
        indexVersion,
        searchSessionKey,
    });

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
        resultsMaxHeight,
    } = useGlobalSearchOverlayChrome(open, scopedResults, onClose, handleResultClick);

    const scanIndexForPreview = useSearchScanIndex(files, executionFiles, criminalCases, pinLookup);

    const showEmptyState = !query.trim();
    const headerBusy = isSearchHeaderBusy(query, isSearching, isLoadingIndex);

    const shellProps = {
        open,
        keepWarm,
        onExitComplete,
        onClose,
        overlayRef,
        inputRef,
        onKeyDownCapture,
        keyboardInset,
        resultsMaxHeight,
        query,
        setQuery,
        showEmptyState,
        headerBusy,
        isEnrichingIndex,
        recentSearches,
        clearRecent,
        isSearching,
        isLoadingIndex,
        results: scopedResults,
        flatResults,
        pick,
        pinLookup,
        scanIndexForPreview,
        activeIndex,
        setActiveIndex,
        searchScope,
        onSearchScopeChange: setSearchScope,
    };

    /*
     * StaticShell دائماً — فتح = visibility/تركيب بلا Motion spring
     * (يمنع وميض الخلفية/اللوحة عند أول فتح بارد).
     */
    if (!open && !keepWarm) {
        return null;
    }

    return <GlobalSearchOverlayStaticShell {...shellProps} />;
}

export function GlobalSearchOverlay(props: GlobalSearchOverlayProps) {
    const {
        open = true,
        files,
        executionFiles,
        globalNotes,
        notifications,
        criminalCases,
        userId,
        indexVersion,
        onClose,
    } = props;

    return (
        <GlobalSearchRuntimeProvider
            overlayOpen={open}
            /* فهرس فقط عند الفتح — لا CPU/RAM على keepAlive المغلق */
            warmIndex={open}
            files={files}
            executionFiles={executionFiles}
            globalNotes={globalNotes}
            notifications={notifications}
            criminalCases={criminalCases}
            userId={userId}
            indexVersion={indexVersion}
        >
            <GlobalSearchErrorBoundary onClose={onClose}>
                <GlobalSearchOverlayInner {...props} />
            </GlobalSearchErrorBoundary>
        </GlobalSearchRuntimeProvider>
    );
}
