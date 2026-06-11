/** تصنيفات المنتدى — الفهرسان 0–1 للترتيب، 2+ للتخصصات (وسوم) */
export const FORUM_FILTER_LABELS = [
    'الأحدث',
    'الأعلى تصويتاً',
    'تنفيذ',
    'مدني',
    'جنائي',
    'أحوال شخصية',
    'شركات',
    'عقاري',
    'معاملات',
    'تقاعد',
    'مصارف',
    'قروض',
    'كاتب العدل',
] as const;

export type ForumFilterLabel = (typeof FORUM_FILTER_LABELS)[number];

export const FORUM_SORT_FILTER_COUNT = 2;

export const FORUM_TOPIC_FILTERS = FORUM_FILTER_LABELS.slice(FORUM_SORT_FILTER_COUNT);
