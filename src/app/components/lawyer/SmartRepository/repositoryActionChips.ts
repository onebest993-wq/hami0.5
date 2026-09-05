import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';

export const REPOSITORY_ACTION_CHIPS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'الكل', value: 'الكل' },
    { label: 'بطاقة', value: REPOSITORY_ACTION_CATEGORY.note },
    { label: 'مسح', value: REPOSITORY_ACTION_CATEGORY.scan },
    { label: 'صورة', value: REPOSITORY_ACTION_CATEGORY.image },
    { label: 'PDF', value: REPOSITORY_ACTION_CATEGORY.pdf },
    { label: 'تسجيل', value: REPOSITORY_ACTION_CATEGORY.voice },
];
