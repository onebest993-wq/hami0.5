/**
 * مزامنة التنفيذ → التقويم: مواعيد الخط الزمني + مهام الاستحقاق ذات التاريخ.
 */
import { CalendarBridge, normalizeDateToYmd } from '@/app/services/calendar/bridge';
import type { DossierSyncStats, SyncScope } from './types';
import { shouldExcludeExecutionFromCalendar } from './exclusions';
import { isRecord, readEntityId, readStr } from './shared';
import { syncExecutionTaskDue, syncExecutionTimelineAppointment } from './incrementalSync';

export function syncOneExecutionFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    scope: SyncScope = {},
): void {
    const includeTasks = scope.includeTasks !== false;
    const executionId = readEntityId(file);
    if (executionId === null) return;
    if (shouldExcludeExecutionFromCalendar(file)) return;
    const caseNo =
        readStr(file, 'fileNumber') ||
        readStr(file, 'caseNo') ||
        readStr(file as Record<string, unknown>, 'caseNumber');
    const clientName = readStr(file, 'creditor') || readStr(file, 'clientName');
    const executionIdStr = String(executionId);

    const timeline = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        syncExecutionTimelineAppointment({
            userId,
            executionId,
            event: {
                id: String(ev.id ?? ''),
                type: readStr(ev, 'type') || undefined,
                date: readStr(ev, 'date') || undefined,
                title: readStr(ev, 'title') || undefined,
                description: readStr(ev, 'description') || undefined,
                trashedAt: (ev.trashedAt as string | null | undefined) ?? null,
            },
            caseNo,
            clientName,
        });
        if (String(ev.type) === 'appointment' && !ev.trashedAt && normalizeDateToYmd(readStr(ev, 'date'))) {
            stats.executionAppointments++;
        }
    }

    if (!includeTasks) return;

    const tasks = Array.isArray(file.caseTasksPending) ? file.caseTasksPending : [];
    for (const t of tasks) {
        if (!isRecord(t)) continue;
        const tid = String(t.id ?? '').trim();
        if (!tid) continue;
        if (t.trashedAt) {
            CalendarBridge.remove('execution', executionIdStr, `task_${tid}`, userId);
            continue;
        }
        const due = normalizeDateToYmd(readStr(t, 'dueDate'));
        if (!due) {
            CalendarBridge.remove('execution', executionIdStr, `task_${tid}`, userId);
            continue;
        }
        syncExecutionTaskDue({
            userId,
            executionId,
            task: {
                id: tid,
                title: readStr(t, 'title') || 'مهمة تنفيذ',
                dueDate: due,
                trashedAt: null,
            },
            caseNo,
            clientName,
        });
        stats.executionTasks++;
    }
}
