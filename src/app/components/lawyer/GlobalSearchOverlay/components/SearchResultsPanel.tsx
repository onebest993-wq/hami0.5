import React from 'react';
import { motion } from 'motion/react';
import { Loader2, SearchX } from 'lucide-react';
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
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: SearchResultsPanelProps) {
    if (isSearching || !results) {
        return (
            <div
                className="flex flex-col items-center justify-center py-16 gap-4"
                data-testid="global-search-loading"
            >
                <motion.div
                    className="relative w-14 h-14 rounded-2xl border border-[#E6C673]/20 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader2 size={24} className="text-[#E6C673]/70 animate-spin" />
                </motion.div>
                <p className="text-white/30 text-sm">
                    {isLoadingIndex ? 'جاري تجهيز الفهرس...' : 'جاري البحث...'}
                </p>
            </div>
        );
    }

    if (!results.hasResults) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-3"
                data-testid="global-search-no-results"
            >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                    <SearchX size={26} className="text-white/15" />
                </div>
                <p className="text-white/35 text-sm">لا نتائج لـ «{query}»</p>
            </motion.div>
        );
    }

    return (
        <div data-testid="global-search-results">
            <ResultsBody
                grouped={results}
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
