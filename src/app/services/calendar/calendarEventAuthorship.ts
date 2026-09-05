import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import { isBridgedCalendarEvent } from '@/app/services/calendar/bridgePersistence/lite';

export { isBridgedCalendarEvent };

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
    return isEphemeralLawsuitTaskId(taskRaw);
}

/** موعد أدخله المستخدم صراحةً — ليس مساراً آلياً أو مُكتملاً */
export function isUserAuthoredBridgedCalendarEvent(event: CalendarEvent): boolean {
    if (!isBridgedCalendarEvent(event)) return true;
    const sourceEventId = String(event.sourceEventId ?? '').trim();
    if (isSyntheticBridgeSourceEventId(sourceEventId)) return false;
    if (event.isCompleted) return false;
    return true;
}
