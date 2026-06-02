import type { LegalTask } from '@/app/types/TaskEngine';
import type { DossierRegistry } from '@/app/services/alertDossierRegistry';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { fieldTaskHasExplicitUserDate } from '@/app/services/calendarAuthenticity';
import {
    daysFromTodayYmd,
    isEventDateOnOrAfterToday,
    localTodayYmd,
} from '@/app/services/alertFutureGate';
import { normalizeDateToYmd } from '@/app/services/calendarBridge';
import { calendarEventToTimestamp } from '@/app/utils/calendarDateTime';

export const FIELD_TASK_ALERT_ID_PREFIX = 'field-task:';

export function isInjectedFieldTaskAlert(
    alert: Pick<SecretaryAlert, 'id' | 'fieldTaskInjected' | 'calendarSource'>,
): boolean {
    if (alert.fieldTaskInjected) return true;
    const id = alert.id ?? '';
    if (id.startsWith(FIELD_TASK_ALERT_ID_PREFIX)) return true;
    return alert.calendarSource?.module === 'field_day_task';
}

export function fieldTaskDueYmd(task: LegalTask): string | null {
    if (!fieldTaskHasExplicitUserDate(task)) return null;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) {
        return normalizeDateToYmd(task.reminderAt.toISOString());
    }
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) {
        return normalizeDateToYmd(task.parsedDate.toISOString());
    }
    return null;
}

function fieldTaskDueIso(task: LegalTask, ymd: string | null, now: Date): string {
    if (ymd) {
        const ts = calendarEventToTimestamp(ymd, undefined, 'end');
        if (ts !== null) return new Date(ts).toISOString();
    }
    const endToday = new Date(now);
    endToday.setHours(23, 59, 0, 0);
    return endToday.toISOString();
}

function fieldTaskLocation(task: LegalTask): string | undefined {
    const direct = task.location?.trim();
    if (direct) return direct;
    const sub = task.subTasks.find((s) => !s.isCompleted && s.location?.trim());
    return sub?.location?.trim() || undefined;
}

/**
 * حقن قراءة فقط لمهام اليوم الميدانية المعلّقة — دون تعديل مصدر Quantum Tasks.
 */
export function buildFieldTaskAlerts(
    tasks: LegalTask[],
    now: Date,
    registry: DossierRegistry,
): SecretaryAlert[] {
    const todayYmd = localTodayYmd(now);
    const out: SecretaryAlert[] = [];

    for (const task of tasks) {
        if (task.status !== 'pending') continue;

        const ymd = fieldTaskDueYmd(task);
        const pinned = Boolean(task.pinnedToFieldCurtain);

        if (!ymd && !pinned) continue;
        if (ymd && !isEventDateOnOrAfterToday(ymd, now)) continue;

        const days = ymd ? daysFromTodayYmd(ymd, todayYmd) : 0;
        if (ymd && days > 7 && !pinned) continue;

        const taskId = String(task.id).trim();
        if (!taskId) continue;

        const linkedId = task.linkedCaseId?.trim() || undefined;
        const dossier = linkedId ? registry.resolve('lawsuit', linkedId) : null;
        const title = (task.title || task.rawText?.slice(0, 80) || 'مهمة ميدانية').trim();
        const location = fieldTaskLocation(task);

        const alert: SecretaryAlert = {
            id: `${FIELD_TASK_ALERT_ID_PREFIX}${taskId}`,
            type: 'DEADLINE',
            title,
            summary: location ? `${location} — مهمة ميدانية` : 'مهمة ميدانية',
            dueAt: fieldTaskDueIso(task, ymd, now),
            suggestedAction: '📋 استعراض وإنجاز المهمة الميدانية',
            aiDeepDive: task.rawText?.trim() || title,
            target: 'schedule',
            entityId: taskId,
            priority: task.isFatalDeadline ? 1 : pinned ? 2 : 3,
            clientName: dossier?.clientName,
            caseNumber: dossier?.caseNumber,
            actionType: location || 'مهمة ميدانية',
            fieldTaskInjected: true,
            fieldTaskPinned: pinned,
            calendarSource: {
                module: 'field_day_task',
                entityId: taskId,
                ...(linkedId
                    ? { dossierModule: 'lawsuit' as const, dossierId: linkedId }
                    : {}),
            },
        };
        out.push(alert);
    }

    return out;
}

export function stripCalendarDuplicatesForFieldTasks(alerts: SecretaryAlert[]): SecretaryAlert[] {
    const injectedIds = new Set<string>();
    for (const a of alerts) {
        if (!isInjectedFieldTaskAlert(a) || !a.entityId) continue;
        injectedIds.add(String(a.entityId));
    }
    if (injectedIds.size === 0) return alerts;

    return alerts.filter((a) => {
        if (!a.id.startsWith('calendar:')) return true;
        const mod = a.calendarSource?.module;
        if (mod !== 'task' && mod !== 'field_day_task') return true;
        const entityId = a.calendarSource?.entityId ?? a.entityId;
        if (!entityId) return true;
        return !injectedIds.has(String(entityId));
    });
}
