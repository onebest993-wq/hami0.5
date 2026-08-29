import { describe, expect, it } from 'vitest';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';
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

describe('flattenGroupedResults', () => {
    it('يرتّب النتائج حسب SEARCH_SECTION_ORDER', () => {
        const grouped: GroupedSearchResults = {
            ...emptyGrouped(),
            lawsuit: [
                { id: 'f1', title: 'ملف', subtitle: '', navigate: { type: 'file', fileId: '1' } },
            ],
            case: [{ id: 'c1', title: 'قضية', subtitle: '', navigate: { type: 'case', caseId: '1' } }],
        };

        const flat = flattenGroupedResults(grouped);
        expect(flat.map((e) => e.id)).toEqual(['f1', 'c1']);
    });

    it('يدمج ملف المعاملة ومركز المعاملات في قسم واحد قبل المستعجل', () => {
        const grouped: GroupedSearchResults = {
            ...emptyGrouped(),
            transaction: [
                { id: 'file-tx', title: 'ملف', subtitle: '', navigate: { type: 'file', fileId: '1' } },
            ],
            threading: [
                {
                    id: 'hub-tx',
                    title: 'مركز',
                    subtitle: '',
                    navigate: { type: 'transactions', transactionId: 't1' },
                },
            ],
            urgent: [
                { id: 'u1', title: 'مستعجل', subtitle: '', navigate: { type: 'urgent', urgentId: '1' } },
            ],
        };

        const flat = flattenGroupedResults(grouped);
        expect(flat.map((e) => e.id)).toEqual(['file-tx', 'hub-tx', 'u1']);
    });
});
