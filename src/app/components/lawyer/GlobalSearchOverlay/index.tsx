import React, { lazy, Suspense } from 'react';
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

const LazyGlobalSearchMotionShell = lazy(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayMotionShell').then((m) => ({
        default: m.GlobalSearchOverlayMotionShell,
    })),
);

export type { GlobalSearchOverlayProps, GlobalSearchNavigate } from '@/app/components/lawyer/GlobalSearchOverlay/types';

function GlobalSearchOverlayInner({
    open = true,
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

    const {
        overlayRef,
        inputRef,
        activeIndex,
        setActiveIndex,
        flatResults,
        pick,
        onKeyDownCapture,
        keyboardInset,
        sheetMotion,
        backdropMotion,
        resultsMaxHeight,
    } = useGlobalSearchOverlayChrome(open, results, onClose, handleResultClick);

    const scanIndexForPreview = useSearchScanIndex(files, executionFiles, criminalCases, pinLookup);

    const showEmptyState = !query.trim();
    const headerBusy = isSearchHeaderBusy(query, isSearching, isLoadingIndex);

    const shellProps = {
        open,
        onExitComplete,
        onClose,
        overlayRef,
        inputRef,
        onKeyDownCapture,
        keyboardInset,
        sheetMotion,
        backdropMotion,
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
        results,
        flatResults,
        pick,
        pinLookup,
        scanIndexForPreview,
        activeIndex,
        setActiveIndex,
    };

    return (
        <Suspense fallback={<GlobalSearchOverlayStaticShell {...shellProps} />}>
            <LazyGlobalSearchMotionShell {...shellProps} />
        </Suspense>
    );
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
