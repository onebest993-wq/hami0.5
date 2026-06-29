import React, { lazy, Suspense } from 'react';
import { SearchIdlePanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchIdlePanel';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

const LazySearchResultsPanel = lazy(() =>
    import('@/app/components/lawyer/GlobalSearchOverlay/components/SearchResultsPanel').then((m) => ({
        default: m.SearchResultsPanel,
    })),
);

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
            className="overflow-y-auto scrollbar-hide overscroll-contain"
            style={{ maxHeight: resultsMaxHeight }}
        >
            {showEmptyState ? (
                <SearchIdlePanel
                    recentSearches={recentSearches}
                    onSelect={setQuery}
                    onClear={clearRecent}
                />
            ) : (
                <Suspense
                    fallback={
                        <div
                            className="flex flex-col items-center justify-center py-16 gap-3"
                            data-testid="global-search-loading"
                            aria-live="polite"
                        >
                            <span className="text-white/50 text-sm font-bold">جاري البحث…</span>
                        </div>
                    }
                >
                    <LazySearchResultsPanel
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
                </Suspense>
            )}
        </div>
    );
}
