import React, { memo } from 'react';
import { AtSign } from 'lucide-react';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { FORUM_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

type ForumMentionSuggestionsProps = {
    suggestions: MentionCandidate[];
    activeIndex: number;
    onSelect: (candidate: MentionCandidate) => void;
    onHover: (index: number) => void;
};

export const ForumMentionSuggestions = memo(function ForumMentionSuggestions({
    suggestions,
    activeIndex,
    onSelect,
    onHover,
}: ForumMentionSuggestionsProps) {
    if (suggestions.length === 0) return null;
    return (
        <div
            className={`absolute bottom-full mb-2 inset-x-0 z-20 ${FORUM_PANEL} rounded-xl border border-[#4A3D52]/50 shadow-xl overflow-hidden`}
            role="listbox"
            aria-label="اقتراحات الإشارة"
        >
            <div className="px-3 py-2 border-b border-[#4A3D52]/40 flex items-center gap-1.5">
                <AtSign size={12} className={FORUM_TEXT_APRICOT} aria-hidden />
                <span className={`${FORUM_TEXT_MUTED} text-[10px] font-bold`}>إشارة زميل</span>
            </div>
            {suggestions.map((c, idx) => (
                <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseEnter={() => onHover(idx)}
                    onClick={() => onSelect(c)}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-2 transition-colors ${
                        idx === activeIndex ? 'bg-[#F0B896]/12' : 'hover:bg-[#342C3E]'
                    }`}
                >
                    <span className="w-7 h-7 rounded-full bg-[#F0B896]/12 border border-[#F0B896]/25 flex items-center justify-center text-[#F0B896] text-[10px] font-bold shrink-0">
                        {c.name.slice(0, 1)}
                    </span>
                    <span className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate flex-1`}>{c.name}</span>
                </button>
            ))}
        </div>
    );
});
