import type { GlobalSearchEntry, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import { SEARCH_SECTION_ORDER } from '@/app/components/lawyer/GlobalSearchOverlay/constants';

export function flattenGroupedResults(grouped: GroupedSearchResults): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    for (const cat of SEARCH_SECTION_ORDER) {
        const entries = grouped[cat];
        if (entries?.length) out.push(...entries);
    }
    return out;
}
