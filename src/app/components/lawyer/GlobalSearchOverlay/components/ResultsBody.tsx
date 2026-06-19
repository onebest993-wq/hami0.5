import React, { useMemo } from 'react';
import {
    SEARCH_CATEGORY_LABELS,
    type GlobalSearchEntry,
    type GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { CATEGORY_META, SEARCH_SECTION_ORDER } from '@/app/components/lawyer/GlobalSearchOverlay/constants';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';
import { ResultRow } from '@/app/components/lawyer/GlobalSearchOverlay/components/ResultRow';
import {
    buildPinFromSearchEntry,
    canPinSearchEntry,
    type WorkspacePinLookupContext,
} from '@/app/workspace/buildPinFromSearchEntry';
import { findCrossSectionLinks } from '@/app/workspace/clusterMatchRules';
import type { ClusterScanRecord } from '@/app/workspace/types';

export interface ResultsBodyProps {
    grouped: GroupedSearchResults;
    query: string;
    onPick: (e: GlobalSearchEntry) => void;
    pinLookup: WorkspacePinLookupContext;
    scanIndex: ClusterScanRecord[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
}

export function ResultsBody({
    grouped,
    query,
    onPick,
    pinLookup,
    scanIndex,
    activeIndex,
    onActiveIndexChange,
}: ResultsBodyProps) {
    const flat = useMemo(() => flattenGroupedResults(grouped), [grouped]);

    const idToIndex = useMemo(() => {
        const map = new Map<string, number>();
        flat.forEach((e, i) => map.set(e.id, i));
        return map;
    }, [flat]);

    const enriched = useMemo(() => {
        const map = new Map<
            string,
            { pinItem: ReturnType<typeof buildPinFromSearchEntry>; relatedLinkCount: number }
        >();
        for (const e of flat) {
            const pinItem = canPinSearchEntry(e) ? buildPinFromSearchEntry(e, pinLookup) : null;
            const relatedLinkCount = pinItem ? findCrossSectionLinks(pinItem, scanIndex).length : 0;
            map.set(e.id, { pinItem, relatedLinkCount });
        }
        return map;
    }, [flat, pinLookup, scanIndex]);

    return (
        <div className="space-y-6 pb-5 px-2">
            {SEARCH_SECTION_ORDER.map((cat) => {
                const entries = grouped[cat];
                if (!entries?.length) return null;
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                return (
                    <section key={cat}>
                        <h3
                            className="font-bold text-[11px] mb-2.5 flex items-center gap-2 uppercase tracking-wide px-2"
                            style={{ color: meta.color }}
                        >
                            <Icon size={14} />
                            <span>{SEARCH_CATEGORY_LABELS[cat]}</span>
                            <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                                style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                            >
                                {entries.length}
                            </span>
                        </h3>
                        <div className="space-y-0.5">
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
                                        icon={Icon}
                                        accent={meta.color}
                                        onClick={() => onPick(e)}
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
