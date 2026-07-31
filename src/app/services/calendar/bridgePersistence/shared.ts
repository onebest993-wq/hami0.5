
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadGlobalNotesRaw, saveGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    deserializeQuantumTasks,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import { debug } from '@/app/utils/debug';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { FIRST_HEARING_TIMELINE_APPT_ID } from '@/app/domain/lawsuit/lawsuitFileFactory';
export {
    CALENDAR_SOURCE_PATCHED_EVENT,
    isBridgedCalendarEvent,
    notifySourcePatched,
    type CalendarSourcePatchDetail,
} from './lite';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function fileIdMatch(a: unknown, entityId: string): boolean {
    if (!a || typeof a !== 'object') return false;
    return String((a as { id?: unknown }).id) === String(entityId);
}

function toIsoDateWithOptionalTime(ymd: string, time?: string): string {
    const t = time && /^\d{1,2}:\d{2}/.test(time) ? time : '12:00';
    return `${ymd}T${t}:00`;
}

export function stripTaskPrefix(sourceEventId: string): string | null {
    if (sourceEventId.startsWith('task_')) return sourceEventId.slice('task_'.length);
    return null;
}

function isCriminalTrialBridgeId(sourceEventId: string): boolean {
    return sourceEventId.startsWith('trial_');
}

function criminalTrialSessionId(sourceEventId: string): string {
    return sourceEventId.replace(/^trial_/, '').replace(/_next$/, '');
}

function isCriminalNextBridgeId(sourceEventId: string): boolean {
    return sourceEventId.endsWith('_next');
}

function criminalBaseEventId(sourceEventId: string): string {
    return isCriminalNextBridgeId(sourceEventId)
        ? sourceEventId.slice(0, -'_next'.length)
        : sourceEventId;
}

export function applyCriminalCalendarUpdate(
    caseRecord: Record<string, unknown>,
    sourceEventId: string,
    fields: { title: string; dateYmd: string; notes?: string },
): Record<string, unknown> {
    if (sourceEventId === 'location_next_hearing') {
        const loc = isRecord(caseRecord.location)
            ? { ...(caseRecord.location as Record<string, unknown>) }
            : {};
        loc.nextHearingDate = fields.dateYmd;
        return { ...caseRecord, location: loc };
    }

    if (isCriminalTrialBridgeId(sourceEventId)) {
        const sessionId = criminalTrialSessionId(sourceEventId);
        const trials = Array.isArray(caseRecord.trials) ? [...(caseRecord.trials as unknown[])] : [];
        const idx = trials.findIndex(
            (s) => s && typeof s === 'object' && String((s as { id?: unknown }).id) === sessionId,
        );
        if (idx < 0) return caseRecord;
        const row = { ...(trials[idx] as Record<string, unknown>) };
        if (isCriminalNextBridgeId(sourceEventId)) {
            row.nextSessionDate = fields.dateYmd;
        } else {
            row.date = fields.dateYmd;
            row.title = fields.title;
        }
        trials[idx] = row;
        return { ...caseRecord, trials };
    }

    const eventId = criminalBaseEventId(sourceEventId);
    const timeline = Array.isArray(caseRecord.timelineEvents)
        ? [...(caseRecord.timelineEvents as unknown[])]
        : [];
    const eIdx = timeline.findIndex(
        (e) => e && typeof e === 'object' && String((e as { id?: unknown }).id) === eventId,
    );
    if (eIdx < 0) return caseRecord;
    const row = { ...(timeline[eIdx] as Record<string, unknown>) };
    if (isCriminalNextBridgeId(sourceEventId)) {
        row.nextDate = fields.dateYmd;
    } else {
        row.date = fields.dateYmd;
        row.title = fields.title;
        if (fields.notes !== undefined) row.description = fields.notes;
    }
    timeline[eIdx] = row;
    return { ...caseRecord, timelineEvents: timeline };
}

export function applyCriminalCalendarRemoval(
    caseRecord: Record<string, unknown>,
    sourceEventId: string,
): Record<string, unknown> {
    if (sourceEventId === 'location_next_hearing') {
        const loc = isRecord(caseRecord.location)
            ? { ...(caseRecord.location as Record<string, unknown>) }
            : {};
        loc.nextHearingDate = '';
        return { ...caseRecord, location: loc };
    }

    if (isCriminalTrialBridgeId(sourceEventId)) {
        const sessionId = criminalTrialSessionId(sourceEventId);
        const trials = Array.isArray(caseRecord.trials) ? [...(caseRecord.trials as unknown[])] : [];
        if (isCriminalNextBridgeId(sourceEventId)) {
            const mapped = trials.map((s) => {
                if (!s || typeof s !== 'object') return s;
                if (String((s as { id?: unknown }).id) !== sessionId) return s;
                return { ...(s as Record<string, unknown>), nextSessionDate: '' };
            });
            return { ...caseRecord, trials: mapped };
        }
        return {
            ...caseRecord,
            trials: trials.filter(
                (s) => !s || typeof s !== 'object' || String((s as { id?: unknown }).id) !== sessionId,
            ),
        };
    }

    const eventId = criminalBaseEventId(sourceEventId);
    const timeline = Array.isArray(caseRecord.timelineEvents)
        ? [...(caseRecord.timelineEvents as unknown[])]
        : [];
    if (isCriminalNextBridgeId(sourceEventId)) {
        const mapped = timeline.map((e) => {
            if (!e || typeof e !== 'object') return e;
            if (String((e as { id?: unknown }).id) !== eventId) return e;
            return { ...(e as Record<string, unknown>), nextDate: '' };
        });
        return { ...caseRecord, timelineEvents: mapped };
    }
    return {
        ...caseRecord,
        timelineEvents: timeline.filter(
            (e) => !e || typeof e !== 'object' || String((e as { id?: unknown }).id) !== eventId,
        ),
    };
}


export async function patchThreadingTaskDeadline(
    userId: string,
    transactionId: string,
    taskId: string,
    patch: { deadline?: string | null; title?: string },
): Promise<boolean> {
    try {
        const uid = resolveCalendarUserId(userId);
        const { TransactionsThreadingDB } = await import('@/app/services/cloud/lawyerTransactionsCloud');
        const state = await TransactionsThreadingDB.getState(uid);
        if (!state) return false;
        const tasks = Array.isArray(state.tasks) ? [...state.tasks] : [];
        const tIdx = tasks.findIndex((t) => t && typeof t === 'object' && String((t as { id?: unknown }).id) === taskId);
        if (tIdx < 0) return false;
        const row = { ...(tasks[tIdx] as Record<string, unknown>) };
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.deadline !== undefined) row.deadline = patch.deadline;
        tasks[tIdx] = row;
        await TransactionsThreadingDB.saveState(uid, {
            transactions: state.transactions,
            tasks,
            financeRecords: state.financeRecords,
            documents: state.documents,
        });
        return true;
    } catch (err) {
        debug.warn('[CalendarBridgePersistence] threading patch failed:', err);
        return false;
    }
}

export function isNextUrgentHearingId(sourceEventId: string): boolean {
    return sourceEventId.endsWith('_next');
}

export function patchLawsuitStorage(
    fileId: string,
    mutator: (file: Record<string, unknown>) => Record<string, unknown>,
): boolean {
    const files = loadLawsuitFilesRaw();
    const idx = files.findIndex((f) => fileIdMatch(f, fileId));
    if (idx < 0) return false;
    const row = files[idx];
    if (!row || typeof row !== 'object') return false;
    const next = [...files];
    next[idx] = mutator({ ...(row as Record<string, unknown>) });
    saveLawsuitFilesRaw(next);
    return true;
}

function mapStages(
    stages: unknown,
    mapStage: (stage: Record<string, unknown>) => Record<string, unknown>,
): unknown[] {
    if (!Array.isArray(stages)) return [];
    return stages.map((s) => {
        if (!s || typeof s !== 'object') return s;
        return mapStage({ ...(s as Record<string, unknown>) });
    });
}

export async function patchTransactionStep(
    userId: string,
    transactionId: string,
    stepId: string,
    patch: { appointmentDate?: string | null; appointmentTime?: string | null; label?: string },
): Promise<boolean> {
    try {
        const uid = resolveCalendarUserId(userId);
        const { TransactionDB } = await import('@/app/services/cloud/lawyerTransactionsCloud');
        const list = (await TransactionDB.getTransactions(uid)) as Array<Record<string, unknown>>;
        const idx = list.findIndex((t) => String(t.id) === String(transactionId));
        if (idx < 0) return false;
        const tx = list[idx];
        const steps = Array.isArray(tx.steps) ? [...(tx.steps as unknown[])] : [];
        const sIdx = steps.findIndex((s) => s && typeof s === 'object' && String((s as { id?: unknown }).id) === String(stepId));
        if (sIdx < 0) return false;
        const step = { ...(steps[sIdx] as Record<string, unknown>), ...patch };
        steps[sIdx] = step;
        const updated = { ...tx, steps, updatedAt: new Date().toISOString() };
        await TransactionDB.updateTransaction({ ...updated, userId: uid } as Parameters<typeof TransactionDB.updateTransaction>[0]);
        return true;
    } catch (err) {
        debug.warn('[CalendarBridgePersistence] transaction patch failed:', err);
        return false;
    }
}

export function applyLawsuitCalendarUpdate(
    file: Record<string, unknown>,
    sourceEventId: string,
    fields: { title: string; dateYmd: string; time?: string; isCompleted?: boolean },
): Record<string, unknown> {
    if (sourceEventId === 'file_next_date') {
        return { ...file, nextDate: fields.dateYmd };
    }
    if (sourceEventId === 'stay_review_date') {
        return { ...file, stayReviewDate: fields.dateYmd };
    }

    const patchHistoryAppointment = (): Record<string, unknown> | null => {
        const history = Array.isArray(file.history) ? [...(file.history as unknown[])] : [];
        const eIdx = history.findIndex(
            (e) => e && typeof e === 'object' && String((e as { id?: unknown }).id) === sourceEventId,
        );
        if (eIdx < 0) return null;
        const row = { ...(history[eIdx] as Record<string, unknown>) };
        row.title = fields.title;
        row.date = fields.time
            ? toIsoDateWithOptionalTime(fields.dateYmd, fields.time)
            : fields.dateYmd;
        if (fields.time) row.time = fields.time;
        history[eIdx] = row;
        let nextFile: Record<string, unknown> = { ...file, history };
        if (sourceEventId === FIRST_HEARING_TIMELINE_APPT_ID) {
            const priorFirst = String(file.firstHearingDate ?? '').trim();
            const priorNext = String(file.nextDate ?? '').trim();
            nextFile = {
                ...nextFile,
                firstHearingDate: fields.dateYmd,
                ...(priorNext === priorFirst || !priorNext ? { nextDate: fields.dateYmd } : {}),
            };
        }
        return nextFile;
    };

    const historyPatched = patchHistoryAppointment();
    if (historyPatched) return historyPatched;

    const taskId = stripTaskPrefix(sourceEventId);
    let patchedRootNextDate = false;
    const stages = mapStages(file.stages, (stage) => {
        let next = { ...stage };
        if (taskId) {
            const tasks = Array.isArray(stage.tasks) ? [...(stage.tasks as unknown[])] : [];
            const tIdx = tasks.findIndex(
                (t) => t && typeof t === 'object' && String((t as { id?: unknown }).id) === taskId,
            );
            if (tIdx >= 0) {
                const row = { ...(tasks[tIdx] as Record<string, unknown>) };
                row.title = fields.title.replace(/^مهمة:\s*/, '');
                row.dueDate = fields.dateYmd;
                if (fields.isCompleted !== undefined) row.isCompleted = fields.isCompleted;
                tasks[tIdx] = row;
                next = { ...next, tasks };
            }
        } else {
            const timeline = Array.isArray(stage.timeline) ? [...(stage.timeline as unknown[])] : [];
            const eIdx = timeline.findIndex(
                (e) => e && typeof e === 'object' && String((e as { id?: unknown }).id) === sourceEventId,
            );
            if (eIdx >= 0) {
                const row = { ...(timeline[eIdx] as Record<string, unknown>) };
                row.title = fields.title;
                row.date = fields.time
                    ? toIsoDateWithOptionalTime(fields.dateYmd, fields.time)
                    : fields.dateYmd;
                if (fields.time) row.time = fields.time;
                timeline[eIdx] = row;
                next = { ...next, timeline };
                if (sourceEventId === FIRST_HEARING_TIMELINE_APPT_ID) {
                    patchedRootNextDate = true;
                }
            }
        }
        return next;
    });
    let nextFile: Record<string, unknown> = { ...file, stages };
    if (patchedRootNextDate) {
        const priorFirst = String(file.firstHearingDate ?? '').trim();
        const priorNext = String(file.nextDate ?? '').trim();
        nextFile = {
            ...nextFile,
            firstHearingDate: fields.dateYmd,
            ...(priorNext === priorFirst || !priorNext ? { nextDate: fields.dateYmd } : {}),
        };
    }
    return nextFile;
}

export function applyLawsuitCalendarRemoval(
    file: Record<string, unknown>,
    sourceEventId: string,
    mode: 'soft' | 'hard',
): Record<string, unknown> {
    const taskId = stripTaskPrefix(sourceEventId);
    const stages = mapStages(file.stages, (stage) => {
        let next = { ...stage };
        if (taskId) {
            const tasks = Array.isArray(stage.tasks)
                ? (stage.tasks as unknown[]).filter(
                      (t) =>
                          !t ||
                          typeof t !== 'object' ||
                          String((t as { id?: unknown }).id) !== taskId,
                  )
                : [];
            next = { ...next, tasks };
        } else {
            const timeline = Array.isArray(stage.timeline) ? [...(stage.timeline as unknown[])] : [];
            if (mode === 'soft') {
                const mapped = timeline.map((e) => {
                    if (!e || typeof e !== 'object') return e;
                    if (String((e as { id?: unknown }).id) !== sourceEventId) return e;
                    return { ...(e as Record<string, unknown>), isDeleted: true };
                });
                next = { ...next, timeline: mapped };
            } else {
                next = {
                    ...next,
                    timeline: timeline.filter((e) => {
                        if (!e || typeof e !== 'object') return true;
                        return String((e as { id?: unknown }).id) !== sourceEventId;
                    }),
                };
            }
        }
        return next;
    });
    return { ...file, stages };
}

export function applyExecutionAppointmentUpdate(
    file: Record<string, unknown>,
    timelineEventId: string,
    fields: { title: string; dateYmd: string; time?: string; description?: string },
): Record<string, unknown> {
    const events = Array.isArray(file.timelineEvents) ? [...(file.timelineEvents as unknown[])] : [];
    const iso = toIsoDateWithOptionalTime(fields.dateYmd, fields.time);
    const nextEvents = events.map((ev) => {
        if (!ev || typeof ev !== 'object') return ev;
        if (String((ev as { id?: unknown }).id) !== timelineEventId) return ev;
        return {
            ...(ev as Record<string, unknown>),
            type: 'appointment',
            date: iso,
            title: fields.title.startsWith('📅') ? fields.title : `📅 ${fields.title}`,
            description: fields.description ?? (ev as { description?: string }).description,
        };
    });
    return { ...file, timelineEvents: nextEvents };
}

export function applyExecutionAppointmentTrash(
    file: Record<string, unknown>,
    timelineEventId: string,
): Record<string, unknown> {
    const iso = new Date().toISOString();
    const events = Array.isArray(file.timelineEvents) ? [...(file.timelineEvents as unknown[])] : [];
    const nextEvents = events.map((ev) => {
        if (!ev || typeof ev !== 'object') return ev;
        if (String((ev as { id?: unknown }).id) !== timelineEventId) return ev;
        return { ...(ev as Record<string, unknown>), trashedAt: iso };
    });
    return { ...file, timelineEvents: nextEvents };
}

export function patchGlobalNote(
    noteId: string,
    patch: { apptDate?: string; title?: string; body?: string },
): boolean {
    const notes = loadGlobalNotesRaw();
    const idx = notes.findIndex((n) => n && typeof n === 'object' && String((n as { id?: unknown }).id) === noteId);
    if (idx < 0) return false;
    const row = { ...(notes[idx] as Record<string, unknown>), ...patch };
    if (patch.apptDate !== undefined) row.apptDate = patch.apptDate;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.body !== undefined) row.body = patch.body;
    const next = [...notes];
    next[idx] = row;
    saveGlobalNotesRaw(next);
    return true;
}

export function patchFieldTaskDue(
    taskId: string,
    patch: { parsedDateIso?: string | null; title?: string },
): boolean {
    try {
        const blob = persistenceRepository.load(QUANTUM_TASKS_STORAGE_KEY);
        const tasks = deserializeQuantumTasks(blob);
        const idx = tasks.findIndex((t) => String(t.id) === taskId);
        if (idx < 0) return false;
        const t = tasks[idx];
        if (patch.title) t.title = patch.title;
        if (patch.parsedDateIso === null) {
            t.parsedDate = null;
            t.reminderAt = null;
        } else if (patch.parsedDateIso) {
            const d = new Date(`${patch.parsedDateIso}T12:00:00`);
            if (!Number.isNaN(d.getTime())) {
                t.parsedDate = d;
                t.reminderAt = d;
            }
        }
        tasks[idx] = t;
        persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(tasks));
        return true;
    } catch (err) {
        debug.warn('[CalendarBridgePersistence] field task patch failed:', err);
        return false;
    }
}

export async function patchUrgentHearing(
    userId: string,
    caseId: string,
    hearingKey: string,
    patch: Record<string, unknown> | null,
): Promise<boolean> {
    try {
        const uid = resolveCalendarUserId(userId);
        const state = await UrgentActionsDB.getState(uid);
        if (!state) return false;
        const cases = Array.isArray(state.cases) ? [...state.cases] : [];
        const cIdx = cases.findIndex(
            (c) => c && typeof c === 'object' && String((c as { id?: unknown }).id) === caseId,
        );
        if (cIdx < 0) return false;
        const caseRow = { ...(cases[cIdx] as Record<string, unknown>) };
        const hearings = Array.isArray(caseRow.hearings) ? [...(caseRow.hearings as unknown[])] : [];

        if (patch === null) {
            if (isNextUrgentHearingId(hearingKey)) {
                const baseId = hearingKey.slice(0, -'_next'.length);
                caseRow.hearings = hearings.map((h) => {
                    if (!h || typeof h !== 'object') return h;
                    if (String((h as { id?: unknown }).id) !== baseId) return h;
                    return { ...(h as Record<string, unknown>), nextSessionDate: '' };
                });
            } else {
                caseRow.hearings = hearings.filter((h) => {
                    if (!h || typeof h !== 'object') return true;
                    return String((h as { id?: unknown }).id) !== hearingKey;
                });
            }
        } else if (isNextUrgentHearingId(hearingKey)) {
            const baseId = hearingKey.slice(0, -'_next'.length);
            const nextDate =
                typeof patch.nextSessionDate === 'string'
                    ? patch.nextSessionDate
                    : typeof patch.sessionDate === 'string'
                      ? patch.sessionDate
                      : '';
            caseRow.hearings = hearings.map((h) => {
                if (!h || typeof h !== 'object') return h;
                if (String((h as { id?: unknown }).id) !== baseId) return h;
                return { ...(h as Record<string, unknown>), nextSessionDate: nextDate };
            });
        } else {
            caseRow.hearings = hearings.map((h) => {
                if (!h || typeof h !== 'object') return h;
                if (String((h as { id?: unknown }).id) !== hearingKey) return h;
                return { ...(h as Record<string, unknown>), ...patch };
            });
        }

        cases[cIdx] = caseRow;
        await UrgentActionsDB.saveState(uid, cases);
        return true;
    } catch (err) {
        debug.warn('[CalendarBridgePersistence] urgent patch failed:', err);
        return false;
    }
}
