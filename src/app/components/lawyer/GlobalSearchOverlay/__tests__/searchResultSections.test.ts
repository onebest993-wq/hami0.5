import { describe, expect, it } from 'vitest';
import { iterSearchResultSections } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchResultSections';
import type { GroupedSearchResults } from '@/app/services/globalSearchIndex';

function emptyGrouped(): GroupedSearchResults {
    return {
        total: 0,
        hasResults: true,
        lawsuit: [],
        execution: [],
        criminal: [],
        transaction: [],
        urgent: [],
        case: [],
        party: [],
        task: [],
        calendar: [],
        note: [],
        voice: [],
        vault: [],
        repository: [],
        community: [],
        threading: [],
        notification: [],
        profile: [],
    };
}

describe('iterSearchResultSections', () => {
    it('قسم معاملات واحد بعدٍّ موحّد من التصنيفين', () => {
        const grouped: GroupedSearchResults = {
            ...emptyGrouped(),
            transaction: [
                {
                    id: 'file-tx',
                    category: 'transaction',
                    title: 'ملف',
                    subtitle: 'إضبارة · 1',
                    lifecycle: 'active',
                    _searchStr: '',
                    navigate: { type: 'file', fileId: '1' },
                },
            ],
            threading: [
                {
                    id: 'hub-tx',
                    category: 'threading',
                    title: 'مركز',
                    subtitle: 'معاملة إدارية — الأحوال',
                    lifecycle: 'active',
                    _searchStr: '',
                    navigate: { type: 'transactions', transactionId: 't1' },
                },
            ],
        };

        const sections = iterSearchResultSections(grouped);
        const tx = sections.find((s) => s.key === 'transaction');
        expect(tx?.label).toBe('معاملات');
        expect(tx?.entries.map((e) => e.id)).toEqual(['file-tx', 'hub-tx']);
        expect(sections.some((s) => s.key === 'threading')).toBe(false);
    });
});
