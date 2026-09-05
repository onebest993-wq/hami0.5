/** نسخة واحدة لتسميات التصنيف وتلميح الخمول — الورقة الحية وجسر الطلاء. */

export const GLOBAL_SEARCH_IDLE_HINT = 'اكتب للبحث في الملفات والمواعيد والملاحظات';

export const GLOBAL_SEARCH_SCOPE_CHIP_LABELS = [
    { id: 'all', label: 'الكل' },
    { id: 'execution', label: 'تنفيذ' },
    { id: 'lawsuit', label: 'دعاوى' },
    { id: 'criminal', label: 'جزائي' },
    { id: 'transactions', label: 'معاملات' },
    { id: 'tasks', label: 'مهام' },
    { id: 'calendar', label: 'تقويم' },
    { id: 'vault', label: 'المستودع' },
    { id: 'notes', label: 'ملاحظات' },
    { id: 'notifications', label: 'إشعارات' },
] as const;

export type GlobalSearchScopeId = (typeof GLOBAL_SEARCH_SCOPE_CHIP_LABELS)[number]['id'];
