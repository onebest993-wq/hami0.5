import React from 'react';
import { GlobalSearchOverlayResultsRegion } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayResultsRegion';
import { GlobalSearchOverlaySheetBody } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlaySheetBody';
import type { GlobalSearchOverlayDialogChromeProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

/** محتوى الحوار الداخلي الكامل — Host / StaticShell فقط */
export function GlobalSearchOverlayDialogChrome({
    open,
    onClose,
    inputRef,
    query,
    setQuery,
    showEmptyState,
    headerBusy,
    recentSearches,
    clearRecent,
    searchUiState,
    results,
    flatResults,
    pick,
    pinLookup,
    scanIndexForPreview,
    activeIndex,
    setActiveIndex,
    searchScope = 'all',
    onSearchScopeChange = () => undefined,
    focusArmed = true,
    keyboardInset = 0,
}: GlobalSearchOverlayDialogChromeProps) {
    return (
        <GlobalSearchOverlaySheetBody
            open={open}
            query={query}
            onQueryChange={setQuery}
            onClose={onClose}
            isBusy={headerBusy}
            inputRef={inputRef}
            scope={searchScope}
            onScopeChange={onSearchScopeChange}
            focusArmed={focusArmed}
            compact={keyboardInset > 0}
            listExpanded={!showEmptyState}
        >
            <GlobalSearchOverlayResultsRegion
                showEmptyState={showEmptyState}
                recentSearches={recentSearches}
                setQuery={setQuery}
                clearRecent={clearRecent}
                query={query}
                searchUiState={searchUiState}
                results={results}
                flatResults={flatResults}
                pick={pick}
                pinLookup={pinLookup}
                scanIndexForPreview={scanIndexForPreview}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
            />
        </GlobalSearchOverlaySheetBody>
    );
}
