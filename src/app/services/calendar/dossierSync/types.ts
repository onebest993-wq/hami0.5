/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import type { LegalTask } from '@/app/types/TaskEngine';

export { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';

export type DossierSyncStats = {
    lawsuitAppointments: number;
    lawsuitTasks: number;
    lawsuitDeadlines: number;
    executionAppointments: number;
    executionTasks: number;
    urgentHearings: number;
    transactionSteps: number;
    criminalTimeline: number;
    criminalTrials: number;
    threadingTasks: number;
    globalNotes: number;
    fieldTasks: number;
    lawsuitLegacy: number;
    /** عدد التواريخ المكتشفة من حقول غير كنسية عبر مكتشف التواريخ الشامل */
    discoveredDates: number;
    prunedOrphans: number;
    purgedInactive: number;
};

export type SyncScope = {
    /** عند false: لا تُزامَن مهام الاستحقاق تلقائياً (تجنّب مواعيد «مختلقة» من مهام النظام) */
    includeTasks?: boolean;
    /** مسار حيّ — فقط نقاط الدخول الأربع في CALENDAR_SYNC_RULES.active */
    whitelistOnly?: boolean;
};

/** لقطة حية من الذاكرة — تُدمج مع التخزين عند التنظيف لتفادي حذف مواعيد غير محفوظة بعد */
export type LiveCalendarSnapshots = {
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
};

export type PruneOptions = {
    includeTasks?: boolean;
    live?: LiveCalendarSnapshots;
};

