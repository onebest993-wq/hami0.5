import React, { useMemo } from 'react';
import type { GlobalSearchEntry, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import { ResultRow } from '@/app/components/lawyer/GlobalSearchOverlay/components/ResultRow';
import { iterSearchResultSections } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchResultSections';
import {
    buildPinFromSearchEntry,
    canPinSearchEntry,
    type WorkspacePinLookupContext,
} from '@/app/workspace/buildPinFromSearchEntry';
import { findCrossSectionLinks } from '@/app/workspace/clusterMatchRules';
import type { ClusterScanRecord } from '@/app/workspace/types';

export interface ResultsBodyProps {
    grouped: GroupedSearchResults;
    flatResults: GlobalSearchEntry[];
    query: string;
    onPick: (e: GlobalSearchEntry) => void;
    pinLookup: WorkspacePinLookupContext;
    scanIndex: ClusterScanRecord[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
}

export function ResultsBody({
    grouped,
    flatResults,
    query,
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: ResultsBodyProps) {
    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        flatResults.forEach((e, i) => map.set(e.id, i));
        return map;
    }, [flatResults]);

    const enriched = useMemo(() => {
        const map = new Map<
            string,
            { pinItem: ReturnType<typeof buildPinFromSearchEntry>; relatedLinkCount: number }
        >();
        for (const e of flatResults) {
            const pinItem = canPinSearchEntry(e) ? buildPinFromSearchEntry(e, pinLookup) : null;
            const relatedLinkCount = pinItem ? findCrossSectionLinks(pinItem, scanIndex).length : 0;
            map.set(e.id, { pinItem, relatedLinkCount });
        }
        return map;
    }, [flatResults, pinLookup, scanIndex]);

    return (
        <div className="space-y-3 pb-4 px-1.5">
            {iterSearchResultSections(grouped).map((section) => {
                const { key, label, entries } = section;
                return (
                    <section key={key}>
                        <h3 className="hami-gs-section-label">
                            <span>{label}</span>
                            <span className="hami-gs-section-count">{entries.length}</span>
                        </h3>
                        <div>
                            {entries.map((e) => {
                                const enrich = enriched.get(e.id);
                                const pinItem = enrich?.pinItem ?? null;
                                const relatedLinkCount = enrich?.relatedLinkCount ?? 0;
                                const resultIndex = idToIndex.get(e.id) ?? -1;
                                return (
                                    <ResultRow
                                        key={e.id}
                                        entry={e}
                                        query={query}
                                        onPick={onPick}
                                        pinItem={pinItem}
                                        relatedLinkCount={relatedLinkCount}
                                        resultIndex={resultIndex}
                                        active={resultIndex === activeIndex}
                                        onActivate={onActiveIndexChange}
                                    />
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
