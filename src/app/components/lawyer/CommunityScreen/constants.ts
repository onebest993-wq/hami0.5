export const AUTO_REDACTION_TOKEN = '[بيانات محجوبة تلقائياً]';

export const FILTERS = ['الأحدث', 'الأعلى تصويتاً', 'تنفيذ', 'مدني', 'جنائي', 'أحوال شخصية', 'شركات', 'عقاري'];

export const SEARCH_FILTER_OPTIONS = [
  { id: 'client' as const, label: 'اسم الموكل' },
  { id: 'property' as const, label: 'رقم العقار' },
  { id: 'vehicle' as const, label: 'رقم المركبة' },
  { id: 'tax' as const, label: 'الإضبارة الضريبية' },
] as const;
