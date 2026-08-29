import { describe, expect, it } from 'vitest';
import { groupSearchResults, SEARCH_CATEGORY_LABELS, type GlobalSearchEntry } from '@/app/services/globalSearchIndex';
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
    it('تسمية المعاملات موحّدة والشرائح ما زالت تصنيفين', () => {
        const tx = SEARCH_SCOPE_CHIPS.find((c) => c.id === 'transactions');
        expect(tx?.categories).toEqual(['transaction', 'threading']);
        expect(SEARCH_CATEGORY_LABELS.transaction).toBe('معاملات');
        expect(SEARCH_CATEGORY_LABELS.threading).toBe('معاملات');
        expect(SEARCH_SCOPE_CHIPS.every((c) => !c.categories.includes('finance' as never))).toBe(true);
    });

    it('يصفي نتائج الإشعارات', () => {
        const grouped = groupSearchResults([
            entry({ id: 'n1', category: 'notification', title: 'تنبيه' }),
            entry({ id: 'l1', category: 'lawsuit', title: 'دعوى' }),
        ]);
        const scoped = filterGroupedResultsByScope(grouped, 'notifications');
        expect(scoped?.notification).toHaveLength(1);
        expect(scoped?.lawsuit).toHaveLength(0);
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
