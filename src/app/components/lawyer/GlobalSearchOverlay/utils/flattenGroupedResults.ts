import type { GlobalSearchEntry, GroupedSearchResults } from '@/app/services/globalSearchIndex';
import { iterSearchResultSections } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchResultSections';

export function flattenGroupedResults(grouped: GroupedSearchResults): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    for (const section of iterSearchResultSections(grouped)) {
        out.push(...section.entries);
    }
    return out;
}
