import React, { memo, useMemo } from 'react';
import { HighlightedText } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { SEARCH_CATEGORY_LABELS } from '@/app/services/globalSearchIndex';
import { globalSearchOptionId } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';
import { SEARCH_LIFECYCLE_LABELS } from '@/app/services/searchLifecycle';
import { sanitizeSearchDisplayText } from '@/app/services/search/searchDisplayText';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildPinFromSearchEntry } from '@/app/workspace/buildPinFromSearchEntry';

export interface ResultRowProps {
    entry: GlobalSearchEntry;
    query: string;
    onPick: (entry: GlobalSearchEntry) => void;
    pinItem: ReturnType<typeof buildPinFromSearchEntry>;
    relatedLinkCount: number;
    resultIndex: number;
    active: boolean;
    onActivate: (index: number) => void;
}

export const ResultRow = memo(function ResultRow({
    entry,
    query,
    onPick,
    pinItem,
    relatedLinkCount,
    resultIndex,
    active,
    onActivate,
}: ResultRowProps) {
    const title = useMemo(() => sanitizeSearchDisplayText(entry.title), [entry.title]);
    const subtitle = useMemo(() => sanitizeSearchDisplayText(entry.subtitle), [entry.subtitle]);
    const snippet = useMemo(
        () => (entry.snippet ? sanitizeSearchDisplayText(entry.snippet) : ''),
        [entry.snippet],
    );
    const categoryLabel = SEARCH_CATEGORY_LABELS[entry.category];
    const lifecycle = entry.lifecycle;
    const isArchived = lifecycle === 'archived';
    const isTrashed = lifecycle === 'deleted';

    return (
        <div
            role="presentation"
            className={`hami-gs-result-card ${active ? 'hami-gs-result-card--active' : ''}`}
        >
            <button
                type="button"
                role="option"
                id={globalSearchOptionId(resultIndex)}
                onClick={() => onPick(entry)}
                onMouseEnter={() => onActivate(resultIndex)}
                data-search-result-index={resultIndex}
                data-testid={`global-search-result-${resultIndex}`}
                data-lifecycle={lifecycle}
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                className="flex-1 min-h-[44px] min-w-0 text-right outline-none py-2 px-2.5 touch-manipulation"
            >
                <div className="flex items-center gap-2 justify-end min-w-0">
                    {isArchived ? (
                        <span
                            className="text-[10px] font-bold text-amber-200/90 shrink-0"
                            data-testid="global-search-lifecycle-archived"
                        >
                            {SEARCH_LIFECYCLE_LABELS.archived}
                        </span>
                    ) : null}
                    {isTrashed ? (
                        <span
                            className="text-[10px] font-bold text-rose-200/90 shrink-0"
                            data-testid="global-search-lifecycle-trash"
                        >
                            {SEARCH_LIFECYCLE_LABELS.deleted}
                        </span>
                    ) : null}
                    <p
                        className={`text-[14px] font-semibold truncate min-w-0 ${
                            active ? 'text-[#E6C673]' : 'text-white/95'
                        }`}
                    >
                        <HighlightedText text={title} query={query} />
                    </p>
                </div>
                <p className="text-[11px] text-white/38 mt-0.5 truncate">
                    {categoryLabel}
                    {subtitle ? (
                        <>
                            {' · '}
                            <HighlightedText text={subtitle} query={query} />
                        </>
                    ) : null}
                </p>
                {snippet ? (
                    <p className="text-[11px] text-white/48 mt-0.5 line-clamp-1">
                        <HighlightedText text={snippet} query={query} />
                    </p>
                ) : null}
            </button>
            {pinItem ? (
                <div className="shrink-0 flex items-center pe-1" onClick={(e) => e.stopPropagation()}>
                    <WorkspacePinButton
                        item={pinItem}
                        relatedLinkCount={relatedLinkCount}
                        className="!min-w-[44px] !min-h-[44px] !w-11 !h-11 touch-manipulation opacity-65"
                        size={13}
                    />
                </div>
            ) : null}
        </div>
    );
});
