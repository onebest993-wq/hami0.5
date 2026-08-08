import React from 'react';
import { SearchIdlePanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchIdlePanel';
import { SearchResultsPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchResultsPanel';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

export type GlobalSearchOverlayResultsRegionProps = Pick<
    GlobalSearchOverlayShellProps,
    | 'showEmptyState'
    | 'recentSearches'
    | 'setQuery'
    | 'clearRecent'
    | 'isLoadingIndex'
    | 'query'
    | 'isSearching'
    | 'results'
    | 'flatResults'
    | 'pick'
    | 'pinLookup'
    | 'scanIndexForPreview'
    | 'activeIndex'
    | 'setActiveIndex'
    | 'resultsMaxHeight'
>;

export function GlobalSearchOverlayResultsRegion({
    showEmptyState,
    recentSearches,
    setQuery,
    clearRecent,
    isLoadingIndex,
    query,
    isSearching,
    results,
    flatResults,
    pick,
    pinLookup,
    scanIndexForPreview,
    activeIndex,
    setActiveIndex,
    resultsMaxHeight,
}: GlobalSearchOverlayResultsRegionProps) {
    return (
        <div
            className="hami-gs-scroll scrollbar-hide"
            style={{ maxHeight: resultsMaxHeight }}
        >
            {showEmptyState ? (
                <SearchIdlePanel
                    recentSearches={recentSearches}
                    onSelect={setQuery}
                    onClear={clearRecent}
                />
            ) : (
                <SearchResultsPanel
                    query={query}
                    isSearching={isSearching}
                    isLoadingIndex={isLoadingIndex}
                    results={results}
                    flatResults={flatResults}
                    onPick={pick}
                    pinLookup={pinLookup}
                    scanIndex={scanIndexForPreview}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(i) => {
                        if (i < 0) return;
                        setActiveIndex(i);
                    }}
                />
            )}
        </div>
    );
}
