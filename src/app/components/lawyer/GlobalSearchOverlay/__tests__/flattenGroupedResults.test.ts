import { describe, expect, it } from 'vitest';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';
import type { GroupedSearchResults } from '@/app/services/globalSearchIndex';

function emptyGrouped(): GroupedSearchResults {
    return {
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
        finance: [],
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
});
