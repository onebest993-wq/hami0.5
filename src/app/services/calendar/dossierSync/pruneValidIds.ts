/**
 * معرّفات الجسر الصالحة — ما يزال مصدره موجوداً في الإضابير.
 */
import { buildStableBridgeId, normalizeDateToYmd } from '@/app/services/calendarBridge';
import { TransactionDB, TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';
import type { PruneOptions } from './types';
import {
    shouldExcludeCriminalFromCalendar,
    shouldExcludeExecutionFromCalendar,
    shouldExcludeLawsuitFromCalendar,
} from './exclusions';
import { collectDiscoveredBridgeIdsForFile } from './discoveredDates';
import { collectStageLegalCalendarSpecs } from '@/app/services/lawsuitTimelineCalendarMirror';
import {
    EXECUTION_VISIT_NEXT_EVENT_ID,
    resolveNextExecutionVisitation,
} from './visitationCalendarSync';
import {
    isFieldTaskCalendarEligible,
    isRecord,
    loadFieldTasksRaw,
    mergeEntityListById,
    readStr,
    taskDateYmd,
} from './shared';

function collectValidBridgeIds(options?: PruneOptions): Set<string> {
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
            for (const spec of collectStageLegalCalendarSpecs(stage, si)) {
                if (spec.id && spec.date && normalizeDateToYmd(spec.date)) {
                    add('lawsuit', fileId, spec.id);
                }
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
        if (resolveNextExecutionVisitation(raw)) {
            add('execution', executionId, EXECUTION_VISIT_NEXT_EVENT_ID);
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

export async function collectValidBridgeIdsAsync(
    userId: string,
    options?: PruneOptions,
): Promise<Set<string>> {
    const ids = collectValidBridgeIds(options);
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
    } catch {
        /* ignore */
    }
    return ids;
}
