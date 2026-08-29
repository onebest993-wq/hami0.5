import type { GlobalSearchCategory, GroupedSearchResults, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { groupSearchResults } from '@/app/services/globalSearchIndex';

/** نطاقات تصنيف البحث — بدون المنتدى القانوني (community تبقى ضمن «الكل» فقط) */
export type GlobalSearchScopeId =
    | 'all'
    | 'execution'
    | 'lawsuit'
    | 'criminal'
    | 'transactions'
    | 'tasks'
    | 'calendar'
    | 'vault'
    | 'notes'
    | 'notifications';

export type GlobalSearchScopeChip = {
    id: GlobalSearchScopeId;
    label: string;
    categories: readonly GlobalSearchCategory[];
};

export const SEARCH_SCOPE_CHIPS: readonly GlobalSearchScopeChip[] = [
    { id: 'all', label: 'الكل', categories: [] },
    { id: 'execution', label: 'تنفيذ', categories: ['execution'] },
    { id: 'lawsuit', label: 'دعاوى', categories: ['lawsuit', 'case', 'party', 'urgent'] },
    { id: 'criminal', label: 'جزائي', categories: ['criminal'] },
    { id: 'transactions', label: 'معاملات', categories: ['transaction', 'threading'] },
    { id: 'tasks', label: 'مهام', categories: ['task'] },
    { id: 'calendar', label: 'تقويم', categories: ['calendar'] },
    { id: 'vault', label: 'المستودع', categories: ['vault', 'repository'] },
    { id: 'notes', label: 'ملاحظات', categories: ['note', 'voice'] },
    { id: 'notifications', label: 'إشعارات', categories: ['notification'] },
] as const;

export function resolveSearchScopeCategories(scope: GlobalSearchScopeId): readonly GlobalSearchCategory[] | null {
    if (scope === 'all') return null;
    const chip = SEARCH_SCOPE_CHIPS.find((c) => c.id === scope);
    return chip?.categories ?? null;
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
