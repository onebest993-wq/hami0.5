import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

export function isBridgedCalendarEvent(event: CalendarEvent): boolean {
    const mod = event.sourceModule;
    return Boolean(mod && mod !== 'manual' && event.sourceEntityId && event.sourceEventId);
}

function isSyntheticBridgeSourceEventId(sourceEventId: string): boolean {
    const id = String(sourceEventId ?? '').trim();
    if (!id) return true;
    if (id.startsWith('legacy_')) return true;
    if (id.startsWith('appeal_')) return true;
    if (id.startsWith('verdict_appeal_')) return true;
    if (id.startsWith('trial_verdict_appeal_')) return true;
    const taskRaw = id.startsWith('task_') ? id.slice('task_'.length) : id;
    return (
        taskRaw.startsWith('task_fast_') ||
        taskRaw.startsWith('auto_') ||
        taskRaw.startsWith('sys_') ||
        taskRaw.startsWith('system_')
    );
}

/** موعد أدخله المستخدم صراحةً — ليس مساراً آلياً أو مُكتملاً */
export function isUserAuthoredBridgedCalendarEvent(event: CalendarEvent): boolean {
    if (!isBridgedCalendarEvent(event)) return true;
    const sourceEventId = String(event.sourceEventId ?? '').trim();
    if (isSyntheticBridgeSourceEventId(sourceEventId)) return false;
    if (event.isCompleted) return false;
    return true;
}
