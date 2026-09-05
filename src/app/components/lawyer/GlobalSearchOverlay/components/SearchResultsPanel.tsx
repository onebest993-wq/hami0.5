import React from 'react';
import type { GlobalSearchEntry, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import { ResultsBody } from '@/app/components/lawyer/GlobalSearchOverlay/components/ResultsBody';
import { GLOBAL_SEARCH_LISTBOX_ID } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';
import {
    isGlobalSearchUiLoading,
    type GlobalSearchUiState,
} from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchUiState';
import { sanitizeSearchDisplayText } from '@/app/services/search/searchDisplayText';

interface SearchResultsPanelProps {
    query: string;
    searchUiState: GlobalSearchUiState;
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
    searchUiState,
    results,
    flatResults,
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: SearchResultsPanelProps) {
    if (isGlobalSearchUiLoading(searchUiState)) {
        return (
            <div
                className="flex items-center justify-center py-3"
                data-testid="global-search-loading"
                aria-live="polite"
            >
                <span className="hami-gs-spinner" aria-hidden />
                <span className="sr-only">جاري البحث</span>
            </div>
        );
    }

    if (searchUiState === 'empty') {
        return (
            <div
                className="flex items-center justify-center px-3 py-3"
                data-testid="global-search-no-results"
            >
                <p className="text-center text-sm font-medium text-white/42">
                    لا نتائج لـ «{sanitizeSearchDisplayText(query)}»
                </p>
            </div>
        );
    }

    if (!results || !results.hasResults) {
        return null;
    }

    return (
        <div
            data-testid="global-search-results"
            id={GLOBAL_SEARCH_LISTBOX_ID}
            role="listbox"
            aria-label="نتائج البحث"
        >
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
