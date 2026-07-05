import type { CalendarEventType } from '@/app/services/calendar/calendarTypes';

/** مصدر الحدث في التطبيق — للربط دون تغيير واجهات الأقسام */
export type CalendarSourceModule =
    | 'lawsuit'
    | 'execution'
    | 'urgent'
    | 'transaction'
    | 'criminal'
    | 'threading'
    | 'task'
    | 'note'
    | 'manual';

/** يطلب LawyerDashboard مزامنة كاملة عند فتح التقويم */
export const CALENDAR_REQUEST_SYNC_EVENT = 'hami:calendar-request-sync';

export type CalendarBridgePayload = {
    userId?: string | null;
    sourceModule: CalendarSourceModule;
    sourceEntityId: string;
    sourceEventId: string;
    date: string;
    time?: string;
    title: string;
    type?: CalendarEventType;
    location?: string;
    notes?: string;
    caseNo?: string;
    /** إضبارة مرتبطة (ملاحظة/مهمة) — تختلف عن sourceEntityId */
    linkedDossierId?: string;
    court?: string;
    clientName?: string;
    clientPhone?: string;
    partiesSummary?: string;
    sourceLabel?: string;
    isCompleted?: boolean;
};

export const CALENDAR_UPDATED_EVENT = 'hami:calendar-updated';

/** يُبث بعد تعديل مصدر الحدث من التقويم (مزامنة عكسية) */
export const CALENDAR_SOURCE_PATCHED_EVENT = 'hami:calendar-source-patched';
