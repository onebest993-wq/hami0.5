/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import {
    buildStableBridgeId,
    CalendarBridge,
    normalizeDateToYmd,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import { TransactionDB, TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import { debug } from '@/app/utils/debug';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { isBridgedCalendarEvent } from '@/app/services/calendarBridgePersistence';
import {
    isEphemeralLawsuitTaskId,
    isSyntheticBridgeSourceEventId,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendarAuthenticity';
import type { PruneOptions } from './types';
import {
    shouldExcludeCriminalFromCalendar,
    shouldExcludeExecutionFromCalendar,
    shouldExcludeLawsuitFromCalendar,
} from './exclusions';
import { collectDiscoveredBridgeIdsForFile } from './discoveredDates';
import {
    dispatchCalendarUpdated,
    isFieldTaskCalendarEligible,
    isRecord,
    loadFieldTasksRaw,
    mergeEntityListById,
    readStr,
    readEntityId,
    taskDateYmd,
} from './shared';
import { findExecutionFile, findLawsuitFile } from './exclusions';


export async function pruneOrphanedBridgedEventsForEntity(
    sourceModule: Parameters<typeof CalendarBridge.remove>[0],
    sourceEntityId: string | number,
    expectedSourceEventIds: Set<string>,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getEvents(uid);
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            const evSourceId = String(e.sourceEventId ?? '');
            if (expectedSourceEventIds.has(evSourceId)) continue;
            // حدث يتيم — احذفه
            await CalendarBridge.remove(sourceModule, entityKey, evSourceId, uid);
            removed++;
        }
        if (removed > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] pruneOrphanedBridgedEventsForEntity failed:', err);
        return 0;
    }
}

/** إزالة كل أحداث التقويم المربوطة بإضبارة (دعوى / تنفيذ / …) */
export async function removeAllBridgedEventsForEntity(
    sourceModule: Parameters<typeof CalendarBridge.remove>[0],
    sourceEntityId: string | number,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getEvents(uid);
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== sourceModule) continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            await CalendarBridge.remove(sourceModule, entityKey, String(e.sourceEventId), uid);
            removed++;
        }
        if (removed > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] removeAllBridgedEventsForEntity failed:', err);
        return 0;
    }
}

export async function purgeInactiveEntityBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        let reassigned = 0;
        const now = new Date().toISOString();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventUserId = e.userId || uid;
            if (!mod || !entityId) {
                await CalendarDB.deleteEvent(e.id, eventUserId);
                removed++;
                continue;
            }
            if (mod === 'lawsuit') {
                const file = findLawsuitFile(entityId);
                if (!file || shouldExcludeLawsuitFromCalendar(file)) {
                    await CalendarBridge.remove('lawsuit', entityId, String(e.sourceEventId), eventUserId);
                    removed++;
                } else if (e.userId !== uid) {
                    await CalendarDB.saveEvent({ ...e, userId: uid, updatedAt: now });
                    reassigned++;
                }
                continue;
            }
            if (mod === 'execution') {
                const file = findExecutionFile(entityId);
                if (!file || shouldExcludeExecutionFromCalendar(file)) {
                    await CalendarBridge.remove('execution', entityId, String(e.sourceEventId), eventUserId);
                    removed++;
                } else if (e.userId !== uid) {
                    await CalendarDB.saveEvent({ ...e, userId: uid, updatedAt: now });
                    reassigned++;
                }
            }
        }
        if (removed > 0 || reassigned > 0) dispatchCalendarUpdated();
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeInactiveEntityBridgedEvents failed:', err);
        return 0;
    }
}

/**
 * يزيل كل مواعيد التقويم المربوطة بإضابير مؤرشفة/محذوفة/في السلة
 * (يُستدعى قبل وبعد المزامنة لتفادي إعادة الرفع من تخزين متأخر).
 */
export async function purgeExcludedDossierBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    for (const raw of loadLawsuitFilesRaw()) {
        if (!isRecord(raw) || !shouldExcludeLawsuitFromCalendar(raw)) continue;
        const fileId = readEntityId(raw);
        if (fileId == null) continue;
        removed += await removeAllBridgedEventsForEntity('lawsuit', fileId, uid);
    }
    for (const raw of loadExecutionFilesRaw()) {
        if (!isRecord(raw) || !shouldExcludeExecutionFromCalendar(raw)) continue;
        const executionId = readEntityId(raw);
        if (executionId == null) continue;
        removed += await removeAllBridgedEventsForEntity('execution', executionId, uid);
    }
    for (const raw of loadCriminalCasesRaw()) {
        if (!isRecord(raw) || !shouldExcludeCriminalFromCalendar(raw)) continue;
        const caseId = readEntityId(raw);
        if (caseId == null) continue;
        removed += await removeAllBridgedEventsForEntity('criminal', caseId, uid);
    }
    if (removed > 0) dispatchCalendarUpdated();
    return removed;
}

function collectValidBridgeIds(userId: string, options?: PruneOptions): Set<string> {
    const includeTasks = options?.includeTasks ?? false;
    const live = options?.live;
    const ids = new Set<string>();
    const add = (module: string, entityId: string, eventId: string) => {
        ids.add(buildStableBridgeId(module, entityId, eventId));
    };

    const lawsuitFiles = mergeEntityListById(loadLawsuitFilesRaw(), live?.lawsuitFiles);
    const executionFiles = mergeEntityListById(loadExecutionFilesRaw(), live?.executionFiles);
    const criminalCases = mergeEntityListById(loadCriminalCasesRaw(), live?.criminalCases);
    const globalNotesList = Array.isArray(live?.globalNotes)
        ? (live!.globalNotes as unknown[])
        : loadGlobalNotesRaw();
    const fieldTasksList = live?.fieldTasks ?? loadFieldTasksRaw();

    for (const raw of lawsuitFiles) {
        if (!isRecord(raw)) continue;
        if (shouldExcludeLawsuitFromCalendar(raw)) continue;
        const fileId = String(raw.id ?? '');
        if (!fileId) continue;
        // معرّفات التواريخ المكتشفة عبر المكتشف الشامل — تُعتبر صالحة لتجنّب التقليم
        for (const fid of collectDiscoveredBridgeIdsForFile(raw, 'lawsuit', fileId)) ids.add(fid);
        const stages = Array.isArray(raw.stages) ? raw.stages : [];
        for (let si = 0; si < stages.length; si++) {
            const stage = stages[si];
            if (!isRecord(stage)) continue;
            const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
            for (const ev of timeline) {
                if (!isRecord(ev)) continue;
                if (String(ev.type) !== 'appointment' || ev.isDeleted) continue;
                const eventId = String(ev.id ?? '').trim();
                if (!eventId || !normalizeDateToYmd(readStr(ev, 'date'))) continue;
                add('lawsuit', fileId, eventId);
            }
            if (includeTasks) {
                const tasks = Array.isArray(stage.tasks) ? stage.tasks : [];
                for (const t of tasks) {
                    if (!isRecord(t)) continue;
                    if (t.isCompleted) continue;
                    const tid = String(t.id ?? '').trim();
                    if (!tid || isEphemeralLawsuitTaskId(tid) || !normalizeDateToYmd(readStr(t, 'dueDate'))) continue;
                    add('lawsuit', fileId, `task_${tid}`);
                }
            }
        }
        if (normalizeDateToYmd(readStr(raw, 'nextDate'))) add('lawsuit', fileId, 'file_next_date');
        if (normalizeDateToYmd(readStr(raw, 'stayReviewDate'))) add('lawsuit', fileId, 'stay_review_date');
        const embeddedNotes = Array.isArray(raw.notes) ? raw.notes : [];
        for (const n of embeddedNotes) {
            if (!isRecord(n)) continue;
            const nid = String(n.id ?? '').trim();
            if (nid && normalizeDateToYmd(readStr(n, 'apptDate'))) add('lawsuit', fileId, `note_${nid}`);
        }
        if (stages.length === 0) {
            const rootTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
            for (const t of rootTasks) {
                if (!isRecord(t)) continue;
                const tid = String(t.id ?? '').trim();
                if (
                    tid &&
                    !isEphemeralLawsuitTaskId(tid) &&
                    !t.isCompleted &&
                    normalizeDateToYmd(readStr(t, 'dueDate'))
                ) {
                    add('lawsuit', fileId, `task_${tid}`);
                }
            }
        }
    }

    for (const raw of executionFiles) {
        if (!isRecord(raw)) continue;
        if (shouldExcludeExecutionFromCalendar(raw)) continue;
        const executionId = String(raw.id ?? '');
        if (!executionId) continue;
        for (const fid of collectDiscoveredBridgeIdsForFile(raw, 'execution', executionId)) ids.add(fid);
        const timeline = Array.isArray(raw.timelineEvents) ? raw.timelineEvents : [];
        for (const ev of timeline) {
            if (!isRecord(ev)) continue;
            if (String(ev.type) !== 'appointment' || ev.trashedAt) continue;
            const eventId = String(ev.id ?? '').trim();
            if (!eventId || !normalizeDateToYmd(readStr(ev, 'date'))) continue;
            add('execution', executionId, eventId);
        }
        if (includeTasks) {
            const tasks = Array.isArray(raw.caseTasksPending) ? raw.caseTasksPending : [];
            for (const t of tasks) {
                if (!isRecord(t)) continue;
                const tid = String(t.id ?? '').trim();
                if (!tid || t.trashedAt || !normalizeDateToYmd(readStr(t, 'dueDate'))) continue;
                add('execution', executionId, `task_${tid}`);
            }
        }
    }

    for (const raw of criminalCases) {
        if (!isRecord(raw) || shouldExcludeCriminalFromCalendar(raw)) continue;
        const caseId = String(raw.id ?? '');
        if (!caseId) continue;
        for (const fid of collectDiscoveredBridgeIdsForFile(raw, 'criminal', caseId)) ids.add(fid);
        const timeline = Array.isArray(raw.timelineEvents) ? raw.timelineEvents : [];
        for (const ev of timeline) {
            if (!isRecord(ev)) continue;
            const eventId = String(ev.id ?? '').trim();
            if (!eventId || !normalizeDateToYmd(readStr(ev, 'date'))) continue;
            add('criminal', caseId, eventId);
            const next = readStr(ev, 'nextDate');
            if (next && normalizeDateToYmd(next) !== normalizeDateToYmd(readStr(ev, 'date'))) {
                add('criminal', caseId, `${eventId}_next`);
            }
        }
        const trials = Array.isArray(raw.trials) ? raw.trials : [];
        for (const session of trials) {
            if (!isRecord(session)) continue;
            const sessionId = String(session.id ?? '').trim();
            if (!sessionId || !normalizeDateToYmd(readStr(session, 'date'))) continue;
            add('criminal', caseId, `trial_${sessionId}`);
            const nextS = readStr(session, 'nextSessionDate');
            if (nextS && normalizeDateToYmd(nextS) !== normalizeDateToYmd(readStr(session, 'date'))) {
                add('criminal', caseId, `trial_${sessionId}_next`);
            }
        }
        const loc = raw.location;
        if (isRecord(loc) && normalizeDateToYmd(readStr(loc, 'nextHearingDate'))) {
            add('criminal', caseId, 'location_next_hearing');
        }
    }

    for (const n of globalNotesList) {
        if (!isRecord(n)) continue;
        const noteId = String(n.id ?? '').trim();
        const d =
            normalizeDateToYmd(readStr(n, 'apptDate')) ||
            normalizeDateToYmd(readStr(n, 'reminder_at')) ||
            normalizeDateToYmd(readStr(n, 'date'));
        if (noteId && d) ids.add(buildStableBridgeId('note', noteId, 'reminder'));
    }

    for (const t of fieldTasksList) {
        if (!isFieldTaskCalendarEligible(t)) continue;
        const ymd = taskDateYmd(t);
        if (ymd) ids.add(buildStableBridgeId('task', String(t.id), 'due'));
    }

    return ids;
}

async function collectValidBridgeIdsAsync(userId: string, options?: PruneOptions): Promise<Set<string>> {
    const ids = collectValidBridgeIds(userId, options);
    try {
        const urgent = await UrgentActionsDB.getState(userId);
        if (urgent?.cases) {
            for (const c of urgent.cases) {
                if (!isRecord(c)) continue;
                const caseId = String(c.id ?? '');
                if (!caseId) continue;
                const hearings = Array.isArray(c.hearings) ? c.hearings : [];
                if (normalizeDateToYmd(readStr(c, 'sessionDate'))) {
                    ids.add(buildStableBridgeId('urgent', caseId, 'case_session_date'));
                }
                const topDl =
                    normalizeDateToYmd(readStr(c, 'deadlineDate')) ||
                    normalizeDateToYmd(readStr(c, 'notificationDate'));
                if (topDl) ids.add(buildStableBridgeId('urgent', caseId, 'case_deadline_date'));
                if (normalizeDateToYmd(readStr(c, 'grievanceSessionDate'))) {
                    ids.add(buildStableBridgeId('urgent', caseId, 'grievance_session_date'));
                }
                const grievanceFirst =
                    normalizeDateToYmd(readStr(c, 'grievanceFirstHearingDate')) ||
                    normalizeDateToYmd(readStr(c, 'phase2FirstHearingDate'));
                if (grievanceFirst) {
                    ids.add(buildStableBridgeId('urgent', caseId, 'grievance_first_hearing'));
                }
                if (normalizeDateToYmd(readStr(c, 'firstHearingDate'))) {
                    const sessionCmp = normalizeDateToYmd(readStr(c, 'sessionDate'));
                    const fh = normalizeDateToYmd(readStr(c, 'firstHearingDate'));
                    if (fh && (!sessionCmp || fh !== sessionCmp)) {
                        ids.add(buildStableBridgeId('urgent', caseId, 'first_hearing_date'));
                    }
                }
                for (const h of hearings) {
                    if (!isRecord(h)) continue;
                    const hid = String(h.id ?? '');
                    const session = readStr(h, 'sessionDate');
                    if (hid && session) {
                        ids.add(buildStableBridgeId('urgent', caseId, hid));
                        const next = readStr(h, 'nextSessionDate');
                        if (next && normalizeDateToYmd(next) !== normalizeDateToYmd(session)) {
                            ids.add(buildStableBridgeId('urgent', caseId, `${hid}_next`));
                        }
                    }
                }
            }
        }
    } catch {
        /* ignore */
    }
    try {
        const txs = (await TransactionDB.getTransactions(userId)) as unknown[];
        for (const tx of txs) {
            if (!isRecord(tx)) continue;
            const txId = String(tx.id ?? '');
            if (!txId) continue;
            const steps = Array.isArray(tx.steps) ? tx.steps : [];
            for (const s of steps) {
                if (!isRecord(s)) continue;
                const stepId = String(s.id ?? '');
                if (stepId && s.appointmentDate) {
                    ids.add(buildStableBridgeId('transaction', txId, stepId));
                }
            }
        }
    } catch {
        /* ignore */
    }
    try {
        const threading = await TransactionsThreadingDB.getState(userId);
        const tasks = Array.isArray(threading?.tasks) ? threading.tasks : [];
        for (const task of tasks) {
            if (!isRecord(task)) continue;
            const taskId = String(task.id ?? '').trim();
            const txId = String(task.transactionId ?? '').trim();
            if (!taskId || !txId) continue;
            if (String(task.status ?? '') === TransactionTaskStatus.Done) continue;
            if (!normalizeDateToYmd(typeof task.deadline === 'string' ? task.deadline : undefined)) continue;
            ids.add(buildStableBridgeId('threading', txId, `task_${taskId}`));
        }
        const financeRecords = Array.isArray(threading?.financeRecords) ? threading.financeRecords : [];
        for (const rec of financeRecords) {
            if (!isRecord(rec)) continue;
            const recordId = String(rec.id ?? '').trim();
            const txId = String(rec.transactionId ?? '').trim();
            if (!recordId || !txId) continue;
            if (!normalizeDateToYmd(typeof rec.date === 'string' ? rec.date : undefined)) continue;
            ids.add(buildStableBridgeId('threading', txId, `finance_${recordId}`));
        }
    } catch {
        /* ignore */
    }
    return ids;
}

/** يحذف من التقويم أحداث الربط التي لم يعد مصدرها موجوداً في الإضابير */
export async function pruneOrphanedBridgeEvents(
    userId?: string | null,
    options?: PruneOptions,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const valid = await collectValidBridgeIdsAsync(uid, options);
    try {
        const events = await CalendarDB.getAllStoredEvents();
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (valid.has(e.id)) continue;
            const eventUserId = e.userId || uid;
            await CalendarBridge.remove(
                e.sourceModule!,
                String(e.sourceEntityId),
                String(e.sourceEventId),
                eventUserId,
            );
            removed++;
        }
        if (removed > 0) {
            dispatchCalendarUpdated();
        }
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] prune failed:', err);
        return 0;
    }
}

export async function purgeNonWhitelistedBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    try {
        const events = await CalendarDB.getAllStoredEvents();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) continue;

            const isFieldSniffer = eventId.startsWith('field_');
            const isLegacySynthetic =
                eventId.startsWith('legacy_') ||
                eventId.startsWith('appeal_') ||
                eventId.startsWith('verdict_appeal_') ||
                eventId.startsWith('trial_verdict_appeal_') ||
                eventId === 'location_next_hearing';
            const isUrgentOrTransactionOrNote =
                mod === 'urgent' || mod === 'transaction' || mod === 'note' || mod === 'task';
            // مدني/تنفيذ — task_* (مهام بـ dueDate)
            const isCivilOrExecTask =
                (mod === 'lawsuit' || mod === 'execution') && eventId.startsWith('task_');
            // مدني — file-level / legacy / appeal مع stage
            const isCivilNonAppointment =
                mod === 'lawsuit' &&
                !eventId.startsWith('task_') &&
                // الـ appointment ids عادةً appt_* أو timeline event id حر — لا نلمس ما يأتي من timeline
                // لذا نُلغي فقط ما يبدأ بـ legacy/appeal/appealStage
                (eventId.startsWith('appeal_stage_') ||
                    eventId === 'nextDate' ||
                    eventId === 'nextHearing');
            // جزائي — كل ما ليس trial_*
            const isCriminalNonTrial = mod === 'criminal' && !eventId.startsWith('trial_');

            const shouldRemove =
                isFieldSniffer ||
                isLegacySynthetic ||
                isUrgentOrTransactionOrNote ||
                isCivilOrExecTask ||
                isCivilNonAppointment ||
                isCriminalNonTrial;

            if (shouldRemove) {
                await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                removed++;
            }
        }
        if (removed > 0) dispatchCalendarUpdated();
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeNonWhitelistedBridgedEvents failed:', err);
    }
    return removed;
}

/** يزيل من التقويم كل موعد مربوط بمصدر نظامي/محسوب/سجل قديم */
export async function purgeInauthenticBridgedEvents(userId?: string | null): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    let removed = 0;
    try {
        const events = await CalendarDB.getAllStoredEvents();
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (isUserAuthoredBridgedCalendarEvent(e)) continue;
            const mod = e.sourceModule;
            const entityId = String(e.sourceEntityId ?? '');
            const eventId = String(e.sourceEventId ?? '');
            if (!mod || !entityId || !eventId) {
                await CalendarDB.deleteEvent(e.id, e.userId || uid);
                removed++;
                continue;
            }
            if (isSyntheticBridgeSourceEventId(eventId)) {
                await CalendarBridge.remove(mod, entityId, eventId, e.userId || uid);
                removed++;
            }
        }
        if (removed > 0) dispatchCalendarUpdated();
    } catch (err) {
        debug.warn('[calendarDossierSync] purgeInauthenticBridgedEvents failed:', err);
    }
    return removed;
}
