import React, { memo } from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { HighlightedText } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { SEARCH_LIFECYCLE_LABELS } from '@/app/services/searchLifecycle';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildPinFromSearchEntry } from '@/app/workspace/buildPinFromSearchEntry';

export interface ResultRowProps {
    entry: GlobalSearchEntry;
    query: string;
    icon: LucideIcon;
    accent: string;
    onClick: () => void;
    pinItem: ReturnType<typeof buildPinFromSearchEntry>;
    relatedLinkCount: number;
    resultIndex: number;
    active: boolean;
    onActivate: (index: number) => void;
}

export const ResultRow = memo(function ResultRow({
    entry,
    query,
    icon: Icon,
    accent,
    onClick,
    pinItem,
    relatedLinkCount,
    resultIndex,
    active,
    onActivate,
}: ResultRowProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`w-full flex items-start gap-2 p-1.5 rounded-2xl transition-all ${
                active
                    ? 'bg-[#E6C673]/[0.08] ring-1 ring-[#E6C673]/25 shadow-[0_0_24px_rgba(230,198,115,0.06)]'
                    : 'hover:bg-white/[0.03]'
            }`}
        >
            {pinItem ? (
                <div className="shrink-0 pt-1.5" onClick={(e) => e.stopPropagation()}>
                    <WorkspacePinButton
                        item={pinItem}
                        relatedLinkCount={relatedLinkCount}
                        className="!min-w-[44px] !min-h-[44px] !w-11 !h-11 touch-manipulation"
                        size={14}
                    />
                </div>
            ) : null}
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => onActivate(resultIndex)}
                data-search-result-index={resultIndex}
                data-testid={`global-search-result-${resultIndex}`}
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                className="flex-1 flex items-start gap-3 text-right group outline-none min-w-0 py-1.5 px-1"
            >
                <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                    style={{ backgroundColor: `${accent}12`, color: accent }}
                    whileHover={{ scale: 1.05 }}
                >
                    <Icon size={18} />
                </motion.div>
                <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2 justify-end min-w-0">
                        {entry.lifecycle !== 'active' ? (
                            <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                                    entry.lifecycle === 'archived'
                                        ? 'bg-amber-500/15 text-amber-300/90'
                                        : 'bg-rose-500/15 text-rose-300/90'
                                }`}
                            >
                                {SEARCH_LIFECYCLE_LABELS[entry.lifecycle]}
                            </span>
                        ) : null}
                        <p
                            className={`text-sm font-bold truncate min-w-0 transition-colors ${
                                active ? 'text-[#E6C673]' : 'text-white group-hover:text-[#E6C673]/90'
                            }`}
                        >
                            <HighlightedText text={entry.title} query={query} />
                        </p>
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5 truncate">
                        <HighlightedText text={entry.subtitle} query={query} />
                    </p>
                    {entry.snippet ? (
                        <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">
                            <HighlightedText text={entry.snippet} query={query} />
                        </p>
                    ) : null}
                </div>
            </button>
        </motion.div>
    );
});
