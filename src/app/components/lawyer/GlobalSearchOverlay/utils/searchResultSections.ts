import type {
    GlobalSearchCategory,
    GlobalSearchEntry,
    GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { SEARCH_CATEGORY_LABELS } from '@/app/services/globalSearchIndex';
import { SEARCH_SECTION_ORDER } from '@/app/components/lawyer/GlobalSearchOverlay/constants';

/** ملف معاملة ومركز المعاملات قسم عرض واحد — الوجهة تُميَّز في العنوان الفرعي. */
const TRANSACTIONS_SECTION_CATS: readonly GlobalSearchCategory[] = ['transaction', 'threading'];

export type SearchResultSection = {
    key: GlobalSearchCategory;
    label: string;
    entries: GlobalSearchEntry[];
};

export function iterSearchResultSections(grouped: GroupedSearchResults): SearchResultSection[] {
    const out: SearchResultSection[] = [];
    for (const cat of SEARCH_SECTION_ORDER) {
        if (cat === 'threading') continue;
        const entries =
            cat === 'transaction'
                ? TRANSACTIONS_SECTION_CATS.flatMap((c) => grouped[c] ?? [])
                : (grouped[cat] ?? []);
        if (!entries.length) continue;
        out.push({
            key: cat,
            label: SEARCH_CATEGORY_LABELS[cat],
            entries,
        });
    }
    return out;
}
