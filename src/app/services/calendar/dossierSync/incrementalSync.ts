/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import {
    CalendarBridge,
    normalizeDateToYmd,
} from '@/app/services/calendarBridge';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { DossierSyncStats } from './types';
import {
    isFieldTaskCalendarEligible,
    isRecord,
    readStr,
    taskDateYmd,
} from './shared';


export function syncGlobalNotesToCalendar(
    notes: unknown[],
    userId: string,
    stats: DossierSyncStats,
): void {
    for (const raw of notes) {
        if (!isRecord(raw)) continue;
        const noteId = String(raw.id ?? '').trim();
        if (!noteId) continue;
        const date =
            normalizeDateToYmd(readStr(raw, 'apptDate')) ||
            normalizeDateToYmd(readStr(raw, 'reminder_at')) ||
            normalizeDateToYmd(readStr(raw, 'date'));
        if (!date) {
            CalendarBridge.remove('note', noteId, 'reminder', userId);
            continue;
        }
        const title =
            readStr(raw, 'title') ||
            readStr(raw, 'body')?.slice(0, 80) ||
            readStr(raw, 'text')?.slice(0, 80) ||
            'ملاحظة';
        const body = readStr(raw, 'body') || readStr(raw, 'text') || readStr(raw, 'content');
        CalendarBridge.syncNoteReminder({
            userId,
            noteId,
            date,
            title,
            body: body || undefined,
            linkedFileId:
                typeof raw.linkedFileId === 'string' || typeof raw.linkedFileId === 'number'
                    ? raw.linkedFileId
                    : undefined,
        });
        stats.globalNotes++;
    }
}

/** مهام الميدان (Quantum Tasks) */
export function syncFieldTasksToCalendar(
    tasks: LegalTask[],
    userId: string,
    stats: DossierSyncStats,
): void {
    for (const t of tasks) {
        const taskId = String(t.id ?? '').trim();
        if (!taskId) continue;
        if (!isFieldTaskCalendarEligible(t)) {
            CalendarBridge.remove('task', taskId, 'due', userId);
            continue;
        }
        const ymd = taskDateYmd(t);
        if (!ymd) {
            CalendarBridge.remove('task', taskId, 'due', userId);
            continue;
        }
        const loc =
            t.location?.trim() ||
            t.subTasks.find((s) => !s.isCompleted && s.location)?.location?.trim() ||
            null;
        CalendarBridge.syncFieldTaskDue({
            userId,
            taskId,
            date: ymd,
            title: t.title || t.rawText?.slice(0, 60) || 'مهمة ميدان',
            location: loc,
            linkedCaseId: t.linkedCaseId,
            isFatalDeadline: t.isFatalDeadline,
        });
        stats.fieldTasks++;
    }
}

export function syncLawsuitTimelineAppointment(p: {
    userId?: string | null;
    fileId: string | number;
    event: { id: string; date?: string; title?: string; details?: string; isDeleted?: boolean };
    caseNo?: string;
    court?: string;
    parties?: unknown;
    clientName?: string;
}): void {
    if (p.event.isDeleted) {
        CalendarBridge.remove('lawsuit', String(p.fileId), String(p.event.id), p.userId);
        return;
    }
    const ymd = normalizeDateToYmd(p.event.date);
    if (!ymd) return;
    CalendarBridge.syncLawsuitAppointment({
        userId: p.userId,
        fileId: p.fileId,
        timelineEventId: String(p.event.id),
        date: ymd,
        title: String(p.event.title || 'موعد'),
        details: p.event.details,
        caseNo: p.caseNo,
        court: p.court,
        parties: p.parties,
        clientName: p.clientName,
    });
}

/** مهمة بتاريخ استحقاق في دعوى مدنية */
export function syncLawsuitTaskDue(p: {
    userId?: string | null;
    fileId: string | number;
    task: { id: string; title: string; dueDate?: string; isCompleted?: boolean };
    caseNo?: string;
    court?: string;
    parties?: unknown;
}): void {
    const ymd = normalizeDateToYmd(p.task.dueDate);
    if (!ymd) {
        CalendarBridge.remove('lawsuit', String(p.fileId), `task_${p.task.id}`, p.userId);
        return;
    }
    CalendarBridge.syncLawsuitTask({
        userId: p.userId,
        fileId: p.fileId,
        taskId: String(p.task.id),
        title: p.task.title,
        dueDate: ymd,
        caseNo: p.caseNo,
        court: p.court,
        parties: p.parties,
        isCompleted: p.task.isCompleted,
    });
}

/** موعد في خط زمني تنفيذ */
export function syncExecutionTimelineAppointment(p: {
    userId?: string | null;
    executionId: string | number;
    event: {
        id: string;
        type?: string;
        date?: string;
        title?: string;
        description?: string;
        trashedAt?: string | null;
    };
    caseNo?: string;
    clientName?: string;
}): void {
    if (p.event.trashedAt) {
        CalendarBridge.remove('execution', String(p.executionId), String(p.event.id), p.userId);
        return;
    }
    if (String(p.event.type || '') !== 'appointment') return;
    const ymd = normalizeDateToYmd(p.event.date);
    if (!ymd) return;
    const title = String(p.event.title || 'موعد تنفيذ').replace(/^📅\s*/, '');
    CalendarBridge.syncExecutionAppointment({
        userId: p.userId,
        executionId: p.executionId,
        timelineEventId: String(p.event.id),
        date: ymd,
        purpose: title,
        description: p.event.description,
        caseNo: p.caseNo,
        clientName: p.clientName,
    });
}

/** مهمة تنفيذ بتاريخ استحقاق */
export function syncExecutionTaskDue(p: {
    userId?: string | null;
    executionId: string | number;
    task: { id: string; title: string; dueDate?: string; trashedAt?: string | null; pinned?: boolean };
    caseNo?: string;
    clientName?: string;
}): void {
    const eventId = `task_${p.task.id}`;
    if (p.task.trashedAt) {
        CalendarBridge.remove('execution', String(p.executionId), eventId, p.userId);
        return;
    }
    const ymd = normalizeDateToYmd(p.task.dueDate);
    if (!ymd) {
        CalendarBridge.remove('execution', String(p.executionId), eventId, p.userId);
        return;
    }
    CalendarBridge.syncExecutionTask({
        userId: p.userId,
        executionId: p.executionId,
        taskId: String(p.task.id),
        title: p.task.title,
        dueDate: ymd,
        caseNo: p.caseNo,
        clientName: p.clientName,
    });
}

