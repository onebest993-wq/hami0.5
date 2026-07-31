/**
 * فلاتر «المواعيد والتنبيهات الحقيقية» — ما أدخله المستخدم صراحةً
 * من إضبارة نشطة (غير مؤرشفة/محذوفة/موقوفة)، وليس مُولَّداً آلياً من النظام.
 */
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import { isBridgedCalendarEvent } from '@/app/services/calendar/bridgePersistence/lite';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { isEventStrictlyAfterToday } from '@/app/services/alertFutureGate';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';

/** مهام/معرّفات مُولَّدة آلياً (مستعجل سريع، إجراءات نظام) */
export function isEphemeralLawsuitTaskId(taskId: string): boolean {
    const id = taskId.trim();
    return (
        id.startsWith('task_fast_') ||
        id.startsWith('auto_') ||
        id.startsWith('sys_') ||
        id.startsWith('system_')
    );
}

/** أحداث سجل قديم أو مسار سريع — لا تُعرض كمواعيد تقويم */
export function isSyntheticBridgeSourceEventId(sourceEventId: string): boolean {
    const id = String(sourceEventId ?? '').trim();
    if (!id) return true;
    if (id.startsWith('legacy_')) return true;
    if (id.startsWith('appeal_')) return true;
    if (id.startsWith('verdict_appeal_')) return true;
    if (id.startsWith('trial_verdict_appeal_')) return true;
    const taskRaw = id.startsWith('task_') ? id.slice('task_'.length) : id;
    if (isEphemeralLawsuitTaskId(taskRaw)) return true;
    return false;
}

/** مهمة ميدان: تاريخ صريح فقط (لا «اليوم» من التثبيت بدون موعد) */
export function fieldTaskHasExplicitUserDate(task: LegalTask): boolean {
    if (task.status !== 'pending') return false;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) return true;
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) return true;
    return false;
}

export function isUserAuthoredBridgedCalendarEvent(event: CalendarEvent): boolean {
    if (!isBridgedCalendarEvent(event)) return true;
    const sourceEventId = String(event.sourceEventId ?? '').trim();
    if (isSyntheticBridgeSourceEventId(sourceEventId)) return false;
    if (event.isCompleted) return false;
    return true;
}

export function filterAuthenticCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(isUserAuthoredBridgedCalendarEvent);
}

/**
 * 🛡️ الفلتر النهائي للبطاقة العامة — WHITELIST صارم
 *
 * يقبل التنبيه فقط إن كان مصدره **واحد** من 4 نقاط دخول صريحة:
 *  1. calendar:* (تنبيه من CalendarDB) — لا يأتي من Sniffer (field_*)
 *  2. request:* (طلب موكل من Supabase) — نشاط وارد
 *  3. (مسموح) تنبيه field-task مع fieldTaskInjected = true (مهمة ميدان مع موعد محدد)
 *
 * يُرفض كل ما عداه (lawsuit/criminal/execution/threading/urgent/financial direct producers)
 * — لأنها produce تنبيهات «مستنتجة» (status / ركود / مهل قانونية) لم يطلبها المستخدم.
 *
 * كذلك يُطبَّق فلتر «المستقبل بدقة» على التنبيهات الزمنية:
 *  - HEARING / DEADLINE / EXECUTION → dueAt يجب أن يكون **بعد اليوم بدقة**
 *  - calendar:* → كذلك (يستبعد الماضي واليوم)
 *  - TASK / URGENT / REQUEST → تنبيهات حالة لا تحتاج تاريخاً مستقبلياً
 */
export function isAuthenticSecretaryAlert(alert: SecretaryAlert): boolean {
    const id = alert.id ?? '';

    // 1. WHITELIST صارم للمصادر
    const allowedPrefix =
        id.startsWith('calendar:') ||
        id.startsWith('request:') ||
        (id.startsWith('field-task:') && Boolean(alert.fieldTaskInjected));
    if (!allowedPrefix) return false;

    // 2. منع تنبيهات calendar:* المُولَّدة من Sniffer (field_*)
    if (id.startsWith('calendar:')) {
        const calendarEventId = id.slice('calendar:'.length);
        if (/_field_/i.test(calendarEventId)) return false;
        const src = (alert as { calendarSource?: { eventId?: string } }).calendarSource;
        if (src?.eventId && String(src.eventId).startsWith('field_')) return false;
    }

    // 3. فلتر «المستقبل بدقة» للتنبيهات الزمنية
    const isTimeBoundAlert =
        alert.type === 'HEARING' ||
        alert.type === 'DEADLINE' ||
        alert.type === 'EXECUTION' ||
        id.startsWith('calendar:');
    if (isTimeBoundAlert && alert.dueAt) {
        const ymd = normalizeDateToYmd(alert.dueAt);
        if (!ymd || !isEventStrictlyAfterToday(ymd)) return false;
    }

    return true;
}

export function filterAuthenticSecretaryAlerts(alerts: SecretaryAlert[]): SecretaryAlert[] {
    return alerts.filter(isAuthenticSecretaryAlert);
}
