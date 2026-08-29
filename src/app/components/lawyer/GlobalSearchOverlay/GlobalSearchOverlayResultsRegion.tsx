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
    | 'query'
    | 'searchUiState'
    | 'results'
    | 'flatResults'
    | 'pick'
    | 'pinLookup'
    | 'scanIndexForPreview'
    | 'activeIndex'
    | 'setActiveIndex'
>;

export function GlobalSearchOverlayResultsRegion({
    showEmptyState,
    recentSearches,
    setQuery,
    clearRecent,
    query,
    searchUiState,
    results,
    flatResults,
    pick,
    pinLookup,
    scanIndexForPreview,
    activeIndex,
    setActiveIndex,
}: GlobalSearchOverlayResultsRegionProps) {
    return (
        <div className="hami-gs-scroll">
            {showEmptyState ? (
                <SearchIdlePanel
                    recentSearches={recentSearches}
                    onSelect={setQuery}
                    onClear={clearRecent}
                />
            ) : (
                <SearchResultsPanel
                    query={query}
                    searchUiState={searchUiState ?? 'idle'}
                    results={results}
                    flatResults={flatResults}
                    onPick={pick}
                    pinLookup={pinLookup}
                    scanIndex={scanIndexForPreview}
                    activeIndex={activeIndex}
                    onActiveIndexChange={setActiveIndex}
                />
            )}
        </div>
    );
}
