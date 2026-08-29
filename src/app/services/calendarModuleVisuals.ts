import type { CalendarSourceModule } from './calendarBridge.types';

export type CalendarModuleVisual = {
    label: string;
};

export const CALENDAR_MODULE_VISUAL: Record<CalendarSourceModule, CalendarModuleVisual> = {
    lawsuit: { label: 'دعوى' },
    execution: { label: 'تنفيذ' },
    criminal: { label: 'جزائي' },
    urgent: { label: 'مستعجل' },
    transaction: { label: 'معاملة' },
    threading: { label: 'إداري' },
    task: { label: 'ميدان' },
    note: { label: 'ملاحظة' },
    manual: { label: 'يدوي' },
};

export function calendarModuleVisual(module?: CalendarSourceModule | null): CalendarModuleVisual {
    if (module && CALENDAR_MODULE_VISUAL[module]) return CALENDAR_MODULE_VISUAL[module];
    return CALENDAR_MODULE_VISUAL.manual;
}
