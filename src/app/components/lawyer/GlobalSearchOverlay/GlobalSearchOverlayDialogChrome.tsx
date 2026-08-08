import React from 'react';
import { SearchHeader } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader';
import { GlobalSearchOverlayResultsRegion } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayResultsRegion';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

export const GLOBAL_SEARCH_DIALOG_CHROME_CLASS = 'hami-gs-sheet';

/** طبقة الغلاف الخارجية للبحث العام — مشتركة بين StaticShell والحركة */
export const GLOBAL_SEARCH_LAYER_CLASS = 'hami-gs-layer';

/** خلفية الإغلاق — نفس اللون على Instant / Static / Motion */
export const GLOBAL_SEARCH_BACKDROP_CLASS = 'hami-gs-backdrop';

/** ┘à╪ص╪ز┘ê┘ë ╪د┘╪ص┘ê╪د╪▒ ╪د┘╪»╪د╪«┘┘è ظ¤ ┘à╪┤╪ز╪▒┘â ╪ذ┘è┘ ╪د┘╪║┘╪د┘ ╪د┘╪س╪د╪ذ╪ز ┘ê╪║┘╪د┘ ╪د┘╪ص╪▒┘â╪ر */
export function GlobalSearchOverlayDialogChrome({
    open,
    onClose,
    inputRef,
    resultsMaxHeight,
    query,
    setQuery,
    showEmptyState,
    headerBusy,
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
    searchScope = 'all',
    onSearchScopeChange = () => undefined,
}: GlobalSearchOverlayShellProps) {
    return (
        <>
            <div
                className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#E6C673]/[0.05] blur-3xl"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#E6C673]/[0.04] to-transparent"
                aria-hidden
            />

            <SearchHeader
                open={open}
                query={query}
                onQueryChange={setQuery}
                onClose={onClose}
                isBusy={headerBusy}
                inputRef={inputRef}
                scope={searchScope}
                onScopeChange={onSearchScopeChange}
            />

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

            <GlobalSearchOverlayResultsRegion
                showEmptyState={showEmptyState}
                recentSearches={recentSearches}
                setQuery={setQuery}
                clearRecent={clearRecent}
                isLoadingIndex={isLoadingIndex}
                query={query}
                isSearching={isSearching}
                results={results}
                flatResults={flatResults}
                pick={pick}
                pinLookup={pinLookup}
                scanIndexForPreview={scanIndexForPreview}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                resultsMaxHeight={resultsMaxHeight}
            />
        </>
    );
}
