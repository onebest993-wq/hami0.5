import type { CalendarEventType } from '@/app/services/lawyer-cloud';

/** تسميات النوع فقط — بلا قوس قزح ألوان أو أيقونات في البطاقة */
export const TYPE_STYLES: Record<CalendarEventType, { label: string }> = {
    hearing: { label: 'جلسة' },
    deadline: { label: 'موعد نهائي' },
    consultation: { label: 'استشارة' },
    execution: { label: 'تنفيذ' },
    custom: { label: 'موعد' },
};
