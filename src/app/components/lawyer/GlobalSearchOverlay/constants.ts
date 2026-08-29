import type { GlobalSearchCategory } from '@/app/services/globalSearchIndex';

export {
    GLOBAL_SEARCH_LISTBOX_ID,
    globalSearchOptionId,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchA11yIds';

/** مهلة دمج الأحرف — أقصر من TIMING.SEARCH_DEBOUNCE العام لإبقاء الحقل فورياً */
export const GLOBAL_SEARCH_QUERY_DEBOUNCE_MS = 140;

export const SEARCH_SECTION_ORDER: GlobalSearchCategory[] = [
    'lawsuit',
    'execution',
    'criminal',
    'transaction',
    'threading',
    'urgent',
    'case',
    'party',
    'task',
    'calendar',
    'note',
    'voice',
    'vault',
    'repository',
    'community',
    'notification',
    'profile',
];
