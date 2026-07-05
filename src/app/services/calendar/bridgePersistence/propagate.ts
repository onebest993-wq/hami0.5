
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';
import {
    isBridgedCalendarEvent,
    notifySourcePatched,
    stripTaskPrefix,
    isNextUrgentHearingId,
    patchLawsuitStorage,
    patchExecutionStorage,
    applyLawsuitCalendarUpdate,
    applyLawsuitCalendarRemoval,
    applyExecutionAppointmentUpdate,
    applyExecutionAppointmentTrash,
    patchGlobalNote,
    patchFieldTaskDue,
    patchUrgentHearing,
    patchTransactionStep,
    applyCriminalCalendarUpdate,
    applyCriminalCalendarRemoval,
    patchThreadingTaskDeadline,
} from './shared';
import { patchCriminalCaseRecord } from '@/app/utils/criminalCasesStorage';

export async function propagateBridgedCalendarUpdate(event: CalendarEvent): Promise<boolean> {
    if (!isBridgedCalendarEvent(event)) return false;
    const mod = event.sourceModule!;
    const entityId = String(event.sourceEntityId);
    const sourceEventId = String(event.sourceEventId);
    // أحداث المكتشف الشامل (field_*) للقراءة فقط من جهة التقويم — تُحرَّر من مصدرها الأصلي
    if (sourceEventId.startsWith('field_')) return false;
    const dateYmd = normalizeDateToYmd(event.date) ?? event.date;
    let ok = false;

    switch (mod) {
        case 'lawsuit':
            ok = patchLawsuitStorage(entityId, (file) =>
                applyLawsuitCalendarUpdate(file, sourceEventId, {
                    title: event.title,
                    dateYmd,
                    time: event.time,
                    isCompleted: event.isCompleted,
                }),
            );
            break;
        case 'execution': {
            const execTaskId = stripTaskPrefix(sourceEventId);
            if (execTaskId) {
                ok = patchExecutionStorage(entityId, (file) => {
                    const tasks = Array.isArray(file.caseTasksPending)
                        ? [...(file.caseTasksPending as unknown[])]
                        : [];
                    const tIdx = tasks.findIndex(
                        (t) =>
                            t &&
                            typeof t === 'object' &&
                            String((t as { id?: unknown }).id) === execTaskId,
                    );
                    if (tIdx < 0) return file;
                    const row = { ...(tasks[tIdx] as Record<string, unknown>) };
                    row.title = event.title.replace(/^مهمة تنفيذ:\s*/, '');
                    row.dueDate = dateYmd;
                    tasks[tIdx] = row;
                    return { ...file, caseTasksPending: tasks };
                });
            } else {
                ok = patchExecutionStorage(entityId, (file) =>
                    applyExecutionAppointmentUpdate(file, sourceEventId, {
                        title: event.title,
                        dateYmd,
                        time: event.time,
                        description: event.notes,
                    }),
                );
            }
            break;
        }
        case 'urgent': {
            if (isNextUrgentHearingId(sourceEventId)) {
                ok = await patchUrgentHearing(event.userId, entityId, sourceEventId, {
                    nextSessionDate: dateYmd,
                    sessionDate: dateYmd,
                });
            } else {
                ok = await patchUrgentHearing(event.userId, entityId, sourceEventId, {
                    sessionDate: dateYmd,
                    notes: event.notes ?? '',
                });
            }
            break;
        }
        case 'transaction':
            ok = await patchTransactionStep(event.userId, entityId, sourceEventId, {
                appointmentDate: `${dateYmd}T12:00:00.000Z`,
                appointmentTime: event.time ?? null,
                label: event.title,
            });
            break;
        case 'note':
            if (sourceEventId === 'reminder') {
                ok = patchGlobalNote(entityId, {
                    apptDate: dateYmd,
                    title: event.title,
                    body: event.notes ?? undefined,
                });
            }
            break;
        case 'task':
            if (sourceEventId === 'due') {
                ok = patchFieldTaskDue(entityId, {
                    parsedDateIso: dateYmd,
                    title: event.title.replace(/^مهمة ميدان:\s*/, ''),
                });
            }
            break;
        case 'criminal':
            ok = patchCriminalCaseRecord(entityId, (caseRecord) =>
                applyCriminalCalendarUpdate(caseRecord, sourceEventId, {
                    title: event.title,
                    dateYmd,
                    notes: event.notes,
                }),
            );
            break;
        case 'threading': {
            const threadingTaskId = stripTaskPrefix(sourceEventId);
            if (threadingTaskId) {
                ok = await patchThreadingTaskDeadline(event.userId, entityId, threadingTaskId, {
                    deadline: dateYmd,
                    title: event.title.replace(/^مهمة:\s*/, ''),
                });
            }
            break;
        }
        default:
            return false;
    }

    if (ok) {
        notifySourcePatched({ sourceModule: mod, sourceEntityId: entityId, sourceEventId });
    }
    return ok;
}

export async function propagateBridgedCalendarRemoval(event: CalendarEvent): Promise<boolean> {
    if (!isBridgedCalendarEvent(event)) return false;
    const mod = event.sourceModule!;
    const entityId = String(event.sourceEntityId);
    const sourceEventId = String(event.sourceEventId);
    // أحداث المكتشف الشامل (field_*) لا يمكن حذفها من التقويم — تُحذف من مصدرها الأصلي
    if (sourceEventId.startsWith('field_')) return false;
    let ok = false;

    switch (mod) {
        case 'lawsuit':
            ok = patchLawsuitStorage(entityId, (file) =>
                applyLawsuitCalendarRemoval(file, sourceEventId, stripTaskPrefix(sourceEventId) ? 'hard' : 'soft'),
            );
            break;
        case 'execution': {
            const execTaskId = stripTaskPrefix(sourceEventId);
            if (execTaskId) {
                ok = patchExecutionStorage(entityId, (file) => {
                    const iso = new Date().toISOString();
                    const tasks = Array.isArray(file.caseTasksPending)
                        ? [...(file.caseTasksPending as unknown[])]
                        : [];
                    const next = tasks.map((t) => {
                        if (!t || typeof t !== 'object') return t;
                        if (String((t as { id?: unknown }).id) !== execTaskId) return t;
                        return { ...(t as Record<string, unknown>), trashedAt: iso };
                    });
                    return { ...file, caseTasksPending: next };
                });
            } else {
                ok = patchExecutionStorage(entityId, (file) =>
                    applyExecutionAppointmentTrash(file, sourceEventId),
                );
            }
            break;
        }
        case 'urgent':
            ok = await patchUrgentHearing(event.userId, entityId, sourceEventId, null);
            break;
        case 'transaction':
            ok = await patchTransactionStep(event.userId, entityId, sourceEventId, {
                appointmentDate: null,
                appointmentTime: null,
            });
            break;
        case 'note':
            if (sourceEventId === 'reminder') {
                ok = patchGlobalNote(entityId, { apptDate: '' });
            }
            break;
        case 'task':
            if (sourceEventId === 'due') {
                ok = patchFieldTaskDue(entityId, { parsedDateIso: null });
            }
            break;
        case 'criminal':
            ok = patchCriminalCaseRecord(entityId, (caseRecord) =>
                applyCriminalCalendarRemoval(caseRecord, sourceEventId),
            );
            break;
        case 'threading': {
            const threadingTaskId = stripTaskPrefix(sourceEventId);
            if (threadingTaskId) {
                ok = await patchThreadingTaskDeadline(event.userId, entityId, threadingTaskId, {
                    deadline: null,
                });
            }
            break;
        }
        default:
            return false;
    }

    if (ok) {
        notifySourcePatched({ sourceModule: mod, sourceEntityId: entityId, sourceEventId });
    }
    return ok;
}
