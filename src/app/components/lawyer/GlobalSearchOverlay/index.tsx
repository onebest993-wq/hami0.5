import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useGlobalSearch } from '@/app/components/lawyer/GlobalSearchOverlay/useGlobalSearch';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchErrorBoundary } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchErrorBoundary';
import { SearchHeader } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader';
import { RecentSearchesPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/RecentSearchesPanel';
import { SearchResultsPanel } from '@/app/components/lawyer/GlobalSearchOverlay/components/SearchResultsPanel';
import { useSearchKeyboard } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard';
import { useSearchScanIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchScanIndex';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';

export type { GlobalSearchOverlayProps, GlobalSearchNavigate } from '@/app/components/lawyer/GlobalSearchOverlay/types';

function GlobalSearchOverlayInner({
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
}: GlobalSearchOverlayProps) {
    const {
        query,
        setQuery,
        isSearching,
        isLoadingIndex,
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
        overlayOpen: true,
    });

    const overlayRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    const flatResults = useMemo(() => {
        if (!results?.hasResults) return [];
        return flattenGroupedResults(results);
    }, [results]);

    const scanIndexForPreview = useSearchScanIndex(files, executionFiles, criminalCases, pinLookup);

    useEffect(() => {
        if (!flatResults.length) {
            setActiveIndex(-1);
            return;
        }
        setActiveIndex((prev) => {
            if (prev >= 0 && prev < flatResults.length) return prev;
            return 0;
        });
    }, [flatResults.length]);

    const pick = (entry: (typeof flatResults)[number]) => handleResultClick(entry.navigate, entry.title);

    const { onKeyDownCapture } = useSearchKeyboard(
        overlayRef,
        flatResults,
        activeIndex,
        setActiveIndex,
        onClose,
        pick,
    );

    const showEmptyState = !query.trim();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-center sm:px-4 sm:pt-[10vh] sm:pb-8"
            role="presentation"
        >
            <motion.button
                type="button"
                aria-label="إغلاق البحث"
                className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            <motion.div
                role="dialog"
                aria-label="بحث شامل"
                aria-modal="true"
                data-testid="global-search-overlay"
                ref={overlayRef}
                onKeyDownCapture={onKeyDownCapture}
                initial={{ y: '100%', opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="relative w-full sm:max-w-xl rounded-t-[28px] sm:rounded-3xl overflow-hidden border-t border-x border-[#E6C673]/12 sm:border bg-[#080D18]/98 backdrop-blur-2xl shadow-[0_-12px_60px_rgba(0,0,0,0.65),0_0_48px_rgba(230,198,115,0.05)] pb-[max(12px,env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#E6C673]/[0.05] blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#E6C673]/[0.04] to-transparent"
                    aria-hidden
                />

                <SearchHeader
                    query={query}
                    onQueryChange={setQuery}
                    onClose={onClose}
                    isBusy={isSearching || isLoadingIndex}
                    inputRef={inputRef}
                />

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

                <div className="max-h-[min(62dvh,560px)] overflow-y-auto scrollbar-hide overscroll-contain">
                    {showEmptyState ? (
                        <RecentSearchesPanel
                            recentSearches={recentSearches}
                            isLoadingIndex={isLoadingIndex}
                            onSelect={setQuery}
                            onClear={clearRecent}
                        />
                    ) : (
                        <SearchResultsPanel
                            query={query}
                            isSearching={isSearching}
                            isLoadingIndex={isLoadingIndex}
                            results={results}
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
            </motion.div>
        </motion.div>
    );
}

export function GlobalSearchOverlay(props: GlobalSearchOverlayProps) {
    return (
        <GlobalSearchErrorBoundary onClose={props.onClose}>
            <GlobalSearchOverlayInner {...props} />
        </GlobalSearchErrorBoundary>
    );
}
