import { useCallback, useMemo, useState } from 'react';
import {
    APPEARANCE_BLOCK_SCOPE_IDS,
    type AppearanceBlockScopeId,
} from '@/app/services/settings/appearanceBlockCatalog';

export function useAppearanceBlockSelection() {
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<AppearanceBlockScopeId>>(
        () => new Set(),
    );

    const selectedIds = useMemo(
        () => APPEARANCE_BLOCK_SCOPE_IDS.filter((id) => selectedBlockIds.has(id)),
        [selectedBlockIds],
    );

    const toggleBlock = useCallback((id: AppearanceBlockScopeId) => {
        setSelectedBlockIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const isSelected = useCallback(
        (id: AppearanceBlockScopeId) => selectedBlockIds.has(id),
        [selectedBlockIds],
    );

    const isAllSelected = selectedIds.length === APPEARANCE_BLOCK_SCOPE_IDS.length;

    const toggleSelectAll = useCallback(() => {
        setSelectedBlockIds((prev) => {
            if (prev.size === APPEARANCE_BLOCK_SCOPE_IDS.length) {
                return new Set();
            }
            return new Set(APPEARANCE_BLOCK_SCOPE_IDS);
        });
    }, []);

    return {
        selectedIds,
        selectedCount: selectedIds.length,
        isAllSelected,
        toggleSelectAll,
        toggleBlock,
        isSelected,
    };
}
