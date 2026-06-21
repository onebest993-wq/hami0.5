import { useCallback, useMemo, useRef, useState } from 'react';

export type MentionCandidate = { id: string; name: string };

type MentionQuery = { start: number; query: string };

function detectMentionQuery(text: string, cursor: number): MentionQuery | null {
    const before = text.slice(0, Math.max(0, cursor));
    const match = before.match(/@([\u0600-\u06FF\w\s]{0,40})$/u);
    if (!match || match.index === undefined) return null;
    return { start: match.index, query: (match[1] ?? '').trimStart() };
}

export function useForumMentionAutocomplete(
    value: string,
    onChange: (next: string) => void,
    candidates: MentionCandidate[],
) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const suggestions = useMemo(() => {
        if (!mentionQuery) return [];
        const q = mentionQuery.query.trim().toLowerCase();
        const filtered = candidates.filter((c) => {
            if (!q) return true;
            return c.name.toLowerCase().includes(q) || c.id.toLowerCase().startsWith(q);
        });
        return filtered.slice(0, 6);
    }, [mentionQuery, candidates]);

    const syncMentionQuery = useCallback(
        (text: string, cursor: number) => {
            const next = detectMentionQuery(text, cursor);
            setMentionQuery(next);
            setActiveIndex(0);
        },
        [],
    );

    const handleValueChange = useCallback(
        (next: string, cursor?: number) => {
            onChange(next);
            const pos = cursor ?? textareaRef.current?.selectionStart ?? next.length;
            syncMentionQuery(next, pos);
        },
        [onChange, syncMentionQuery],
    );

    const insertMention = useCallback(
        (candidate: MentionCandidate) => {
            if (!mentionQuery) return;
            const el = textareaRef.current;
            const cursor = el?.selectionStart ?? value.length;
            const before = value.slice(0, mentionQuery.start);
            const after = value.slice(cursor);
            const token = `@${candidate.name.trim()} `;
            const next = `${before}${token}${after}`;
            onChange(next);
            setMentionQuery(null);
            setActiveIndex(0);
            requestAnimationFrame(() => {
                if (!el) return;
                const pos = before.length + token.length;
                el.focus();
                el.setSelectionRange(pos, pos);
            });
        },
        [mentionQuery, onChange, value],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (!mentionQuery || suggestions.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(suggestions[activeIndex]!);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
        },
        [activeIndex, insertMention, mentionQuery, suggestions],
    );

    return {
        textareaRef,
        suggestions,
        showSuggestions: Boolean(mentionQuery && suggestions.length > 0),
        activeIndex,
        setActiveIndex,
        handleValueChange,
        handleKeyDown,
        insertMention,
        closeSuggestions: () => setMentionQuery(null),
    };
}
