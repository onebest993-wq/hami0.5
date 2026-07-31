import React, { memo, useMemo, type ElementType } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { HighlightedText } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { SEARCH_CATEGORY_LABELS } from '@/app/services/globalSearchIndex';
import { globalSearchOptionId } from '@/app/components/lawyer/GlobalSearchOverlay/constants';
import { SEARCH_LIFECYCLE_LABELS } from '@/app/services/searchLifecycle';
import { sanitizeSearchDisplayText } from '@/app/services/search/searchDisplayText';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildPinFromSearchEntry } from '@/app/workspace/buildPinFromSearchEntry';

export interface ResultRowProps {
    entry: GlobalSearchEntry;
    query: string;
    onClick: () => void;
    pinItem: ReturnType<typeof buildPinFromSearchEntry>;
    relatedLinkCount: number;
    resultIndex: number;
    active: boolean;
    onActivate: (index: number) => void;
    icon?: ElementType;
    accent?: string;
}

export const ResultRow = memo(function ResultRow({
    entry,
    query,
    onClick,
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
            className={`w-full flex items-stretch gap-1 rounded-2xl transition-colors duration-150 ${
                active
                    ? 'bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(230,198,115,0.28)]'
                    : 'hover:bg-white/[0.03]'
            }`}
        >
            <button
                type="button"
                role="option"
                id={globalSearchOptionId(resultIndex)}
                onClick={onClick}
                onMouseEnter={() => onActivate(resultIndex)}
                data-search-result-index={resultIndex}
                data-testid={`global-search-result-${resultIndex}`}
                data-lifecycle={lifecycle}
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                className="flex-1 min-w-0 text-right group outline-none py-3 px-3 touch-manipulation"
            >
                <div className="flex items-center gap-2 justify-between min-w-0">
                    <span className="text-[10px] text-white/30 font-bold shrink-0 tracking-wide">
                        {categoryLabel}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 justify-end">
                        {isArchived ? (
                            <span
                                className="inline-flex items-center gap-1 min-h-[22px] px-2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-200 border border-amber-400/30 shrink-0"
                                data-testid="global-search-lifecycle-archived"
                            >
                                <Archive size={11} strokeWidth={2.3} aria-hidden />
                                {SEARCH_LIFECYCLE_LABELS.archived}
                            </span>
                        ) : null}
                        {isTrashed ? (
                            <span
                                className="inline-flex items-center gap-1 min-h-[22px] px-2 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-200 border border-rose-400/30 shrink-0"
                                data-testid="global-search-lifecycle-trash"
                            >
                                <Trash2 size={11} strokeWidth={2.3} aria-hidden />
                                {SEARCH_LIFECYCLE_LABELS.deleted}
                            </span>
                        ) : null}
                        <p
                            className={`text-[15px] font-bold truncate min-w-0 ${
                                active ? 'text-[#E6C673]' : 'text-white/95 group-hover:text-[#E6C673]/90'
                            }`}
                        >
                            <HighlightedText text={title} query={query} />
                        </p>
                    </div>
                </div>
                {subtitle ? (
                    <p className="text-[11px] text-white/42 mt-1 truncate leading-relaxed">
                        <HighlightedText text={subtitle} query={query} />
                    </p>
                ) : null}
                {snippet ? (
                    <p className="text-[12px] text-white/55 mt-1.5 line-clamp-2 leading-relaxed">
                        <HighlightedText text={snippet} query={query} />
                    </p>
                ) : null}
            </button>
            {pinItem ? (
                <div className="shrink-0 flex items-center pe-1.5" onClick={(e) => e.stopPropagation()}>
                    <WorkspacePinButton
                        item={pinItem}
                        relatedLinkCount={relatedLinkCount}
                        className="!min-w-[40px] !min-h-[40px] !w-10 !h-10 touch-manipulation opacity-70 hover:opacity-100"
                        size={13}
                    />
                </div>
            ) : null}
        </div>
    );
});
