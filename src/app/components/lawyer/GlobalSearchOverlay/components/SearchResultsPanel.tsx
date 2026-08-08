import React from 'react';
import { Loader2, SearchX } from '@/app/components/ui/lucideIcons';
import type { GroupedSearchResults } from '@/app/services/globalSearchIndex';
import { ResultsBody } from '@/app/components/lawyer/GlobalSearchOverlay/components/ResultsBody';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

export interface SearchResultsPanelProps {
    query: string;
    isSearching: boolean;
    isLoadingIndex: boolean;
    results: GroupedSearchResults | null;
    flatResults: GlobalSearchEntry[];
    onPick: (entry: GlobalSearchEntry) => void;
    pinLookup: WorkspacePinLookupContext;
    scanIndex: ClusterScanRecord[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
}

export function SearchResultsPanel({
    query,
    isSearching,
    isLoadingIndex,
    results,
    flatResults,
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: SearchResultsPanelProps) {
    if (isSearching || (Boolean(query.trim()) && isLoadingIndex && !results)) {
        return (
            <div
                className="flex flex-col items-center justify-center min-h-[12rem] py-16 gap-3"
                data-testid="global-search-loading"
                aria-live="polite"
            >
                <Loader2 size={28} className="text-[#E6C673]/70 animate-spin" aria-hidden />
                <span className="sr-only">جاري البحث</span>
            </div>
        );
    }

    if (!results || !results.hasResults) {
        return (
            <div
                className="flex flex-col items-center justify-center min-h-[12rem] py-16 gap-3"
                data-testid="global-search-no-results"
            >
                <div className="hami-gs-empty-orb">
                    <SearchX size={26} className="text-white/15" />
                </div>
                <p className="text-white/35 text-sm">لا نتائج لـ «{query}»</p>
            </div>
        );
    }

    return (
        <div data-testid="global-search-results">
            <ResultsBody
                grouped={results}
                flatResults={flatResults}
                query={query}
                onPick={onPick}
                pinLookup={pinLookup}
                scanIndex={scanIndex}
                activeIndex={activeIndex}
                onActiveIndexChange={onActiveIndexChange}
            />
        </div>
    );
}
