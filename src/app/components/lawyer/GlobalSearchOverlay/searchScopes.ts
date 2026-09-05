import type { GlobalSearchCategory, GroupedSearchResults, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { groupSearchResults } from '@/app/services/globalSearchIndex';
import {
    GLOBAL_SEARCH_SCOPE_CHIP_LABELS,
    type GlobalSearchScopeId,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopeChipLabels';

export type { GlobalSearchScopeId };

const SCOPE_CATEGORIES: Record<GlobalSearchScopeId, readonly GlobalSearchCategory[]> = {
    all: [],
    execution: ['execution'],
    lawsuit: ['lawsuit', 'case', 'party', 'urgent'],
    criminal: ['criminal'],
    transactions: ['transaction', 'threading'],
    tasks: ['task'],
    calendar: ['calendar'],
    vault: ['vault', 'repository'],
    notes: ['note', 'voice'],
    notifications: ['notification'],
};

export const SEARCH_SCOPE_CHIPS = GLOBAL_SEARCH_SCOPE_CHIP_LABELS.map((chip) => ({
    id: chip.id,
    label: chip.label,
    categories: SCOPE_CATEGORIES[chip.id],
}));

function resolveSearchScopeCategories(scope: GlobalSearchScopeId): readonly GlobalSearchCategory[] | null {
    if (scope === 'all') return null;
    return SCOPE_CATEGORIES[scope];
}

export function entryMatchesSearchScope(entry: GlobalSearchEntry, scope: GlobalSearchScopeId): boolean {
    const cats = resolveSearchScopeCategories(scope);
    if (!cats) return true;
    return cats.includes(entry.category);
}

export function filterGroupedResultsByScope(
    grouped: GroupedSearchResults | null,
    scope: GlobalSearchScopeId,
): GroupedSearchResults | null {
    if (!grouped) return null;
    if (scope === 'all') return grouped;
    const cats = resolveSearchScopeCategories(scope);
    if (!cats) return grouped;
    const filtered: GlobalSearchEntry[] = [];
    for (const cat of cats) {
        const list = grouped[cat];
        if (list?.length) filtered.push(...list);
    }
    return groupSearchResults(filtered);
}
