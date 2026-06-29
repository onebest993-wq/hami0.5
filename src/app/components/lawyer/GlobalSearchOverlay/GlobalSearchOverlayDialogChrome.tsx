import React from 'react';
import { SearchHeader } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader';
import { GlobalSearchOverlayResultsRegion } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayResultsRegion';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

export const GLOBAL_SEARCH_DIALOG_CHROME_CLASS =
    'relative w-full sm:max-w-xl rounded-t-[28px] sm:rounded-3xl overflow-hidden border-t border-x border-[#E6C673]/12 sm:border bg-[#080D18]/98 backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.65),0_0_48px_rgba(230,198,115,0.05)] pb-[max(12px,env(safe-area-inset-bottom))]';

/** محتوى الحوار الداخلي — مشترك بين الغلاف الثابت وغلاف الحركة */
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
