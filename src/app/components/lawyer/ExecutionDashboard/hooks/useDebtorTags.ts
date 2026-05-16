import { useState, useCallback } from 'react';

export function useDebtorTags() {
    const [customTags, setCustomTags] = useState<Record<string, string[]>>({});
    const [tagInputOpen, setTagInputOpen] = useState<Record<string, boolean>>({});
    const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});

    const debtorTags = useCallback(
        (key: string) => customTags[key] ?? [],
        [customTags]
    );

    const handleAddTag = useCallback(
        (debtorKey: string) => {
            const trimmed = (tagDrafts[debtorKey] ?? '').trim();
            if (!trimmed) return;
            const current = customTags[debtorKey] ?? [];
            if (current.includes(trimmed)) return;
            setCustomTags(prev => ({ ...prev, [debtorKey]: [...(prev[debtorKey] ?? []), trimmed] }));
            setTagDrafts(prev => ({ ...prev, [debtorKey]: '' }));
            setTagInputOpen(prev => ({ ...prev, [debtorKey]: false }));
        },
        [tagDrafts, customTags]
    );

    const handleRemoveTag = useCallback((debtorKey: string, tag: string) => {
        setCustomTags(prev => ({
            ...prev,
            [debtorKey]: (prev[debtorKey] ?? []).filter(t => t !== tag),
        }));
    }, []);

    return {
        customTags,
        setCustomTags,
        tagInputOpen,
        setTagInputOpen,
        tagDrafts,
        setTagDrafts,
        debtorTags,
        handleAddTag,
        handleRemoveTag,
    };
}
