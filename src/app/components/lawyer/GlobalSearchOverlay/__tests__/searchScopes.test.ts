import { describe, expect, it } from 'vitest';
import { groupSearchResults, type GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    SEARCH_SCOPE_CHIPS,
    entryMatchesSearchScope,
    filterGroupedResultsByScope,
} from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

function entry(
    overrides: Partial<GlobalSearchEntry> & Pick<GlobalSearchEntry, 'id' | 'category' | 'title'>,
): GlobalSearchEntry {
    return {
        lifecycle: 'active',
        subtitle: '',
        _searchStr: '',
        navigate: { type: 'vault' },
        ...overrides,
    };
}

describe('searchScopes', () => {
    it('لا يتضمن نطاقاً للمنتدى', () => {
        expect(SEARCH_SCOPE_CHIPS.some((c) => c.id === 'all')).toBe(true);
        expect(SEARCH_SCOPE_CHIPS.every((c) => !c.categories.includes('community' as never))).toBe(true);
    });

    it('يصفي النتائج حسب نطاق التنفيذ', () => {
        const grouped = groupSearchResults([
            entry({ id: 'e1', category: 'execution', title: 'تنفيذ' }),
            entry({ id: 'l1', category: 'lawsuit', title: 'دعوى' }),
            entry({
                id: 't1',
                category: 'task',
                title: 'مهمة',
                navigate: { type: 'tasks_manager' },
            }),
        ]);
        const scoped = filterGroupedResultsByScope(grouped, 'execution');
        expect(scoped?.hasResults).toBe(true);
        expect(scoped?.execution).toHaveLength(1);
        expect(scoped?.lawsuit).toHaveLength(0);
        expect(entryMatchesSearchScope(entry({ id: 'e1', category: 'execution', title: 'x' }), 'execution')).toBe(
            true,
        );
        expect(entryMatchesSearchScope(entry({ id: 'l1', category: 'lawsuit', title: 'x' }), 'execution')).toBe(
            false,
        );
    });
});
