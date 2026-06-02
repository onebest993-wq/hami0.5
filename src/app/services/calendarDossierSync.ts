/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import {
    buildStableBridgeId,
    CalendarBridge,
    fireAndForgetCalendarSync,
    flushPendingCalendarSyncs,
    normalizeDateToYmd,
    partiesSummaryFromList,
    resolveCalendarUserId,
    upsertCalendarFromModule,
} from './calendarBridge';
import { CALENDAR_UPDATED_EVENT } from './calendarBridge.types';
import { debug } from '@/app/utils/debug';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadCriminalCasesRaw } from '@/app/utils/criminalCasesStorage';
import { loadGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import {
    QUANTUM_TASKS_STORAGE_KEY,
    deserializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { LegalTask } from '@/app/types/TaskEngine';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { CalendarDB, TransactionDB, TransactionsThreadingDB } from '@/app/services/lawyer-cloud';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { isBridgedCalendarEvent } from './calendarBridgePersistence';
import { isExecutionInTrash } from '@/app/utils/executionTrash';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import {
    fieldTaskHasExplicitUserDate,
    isEphemeralLawsuitTaskId,
    isSyntheticBridgeSourceEventId,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendarAuthenticity';
import { discoverImplicitDossierDates } from '@/app/services/calendarDateSniffer';

export { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';

export type DossierSyncStats = {
    lawsuitAppointments: number;
    lawsuitTasks: number;
    lawsuitDeadlines: number;
    executionAppointments: number;
    executionTasks: number;
    urgentHearings: number;
    transactionSteps: number;
    criminalTimeline: number;
    criminalTrials: number;
    threadingTasks: number;
    globalNotes: number;
    fieldTasks: number;
    lawsuitLegacy: number;
    /** عدد التواريخ المكتشفة من حقول غير كنسية عبر مكتشف التواريخ الشامل */
    discoveredDates: number;
    prunedOrphans: number;
    purgedInactive: number;
};

type SyncScope = {
    /** عند false: لا تُزامَن مهام الاستحقاق تلقائياً (تجنّب مواعيد «مختلقة» من مهام النظام) */
    includeTasks?: boolean;
};

/** لقطة حية من الذاكرة — تُدمج مع التخزين عند التنظيف لتفادي حذف مواعيد غير محفوظة بعد */
export type LiveCalendarSnapshots = {
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
};

type PruneOptions = {
    includeTasks?: boolean;
    live?: LiveCalendarSnapshots;
};

function mergeEntityListById(
    fromStorage: Record<string, unknown>[],
    live?: unknown[],
): Record<string, unknown>[] {
    const map = new Map<string, Record<string, unknown>>();
    for (const raw of fromStorage) {
        if (!isRecord(raw)) continue;
        const id = String(raw.id ?? '').trim();
        if (!id) continue;
        map.set(id, raw);
    }
    if (Array.isArray(live)) {
        for (const raw of live) {
            if (!isRecord(raw)) continue;
            const id = String(raw.id ?? '').trim();
            if (!id) continue;
            map.set(id, raw);
        }
    }
    return [...map.values()];
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function readStr(o: Record<string, unknown>, key: string): string {
    const v = o[key];
    return typeof v === 'string' ? v.trim() : '';
}

function readEntityId(file: Record<string, unknown>): string | number | null {
    const id = file.id;
    if (id === undefined || id === null) return null;
    if (typeof id === 'string' || typeof id === 'number') return id;
    return String(id);
}

/** لا يُرفع للتقويم: سلة المحذوفات، الأرشيف، أو مرحلة مؤرشفة */
export function shouldExcludeLawsuitFromCalendar(file: Record<string, unknown>): boolean {
    if (isLawsuitInTrash(file) || isLawsuitArchived(file)) return true;
    const status = String(file.status ?? '');
    return status === 'archived_stage' || status === 'paused';
}

/** لا يُرفع للتقويم: سلة التنفيذ أو حالة إضبارة غير نشطة */
export function shouldExcludeExecutionFromCalendar(file: Record<string, unknown>): boolean {
    if (isExecutionInTrash(file as { executionTrashDeletedAt?: string | null })) return true;
    const status = String(file.status ?? '');
    return status === 'archived' || status === 'archived_stage' || status === 'deleted';
}

/** لا يُرفع للتقويم: مضمومة، مؤرشفة، أو مدمجة في إضبارة أخرى */
export function shouldExcludeCriminalFromCalendar(caseRecord: Record<string, unknown>): boolean {
    if (caseRecord.isArchived === true) return true;
    if (String(caseRecord.dossierStatus ?? '') === 'merged') return true;
    if (String(caseRecord.mergedIntoCaseId ?? '').trim()) return true;
    return false;
}

function clientNameFromPartiesList(parties: unknown): string {
    if (!Array.isArray(parties)) return '';
    for (const p of parties) {
        if (!isRecord(p)) continue;
        if (p.isClient === true || /موكل|client/i.test(String(p.role ?? ''))) {
            const name = readStr(p, 'name');
            if (name) return name;
        }
    }
    for (const p of parties) {
        if (!isRecord(p)) continue;
        const name = readStr(p, 'name');
        if (name) return name;
    }
    return '';
}

function criminalClientName(caseRecord: Record<string, unknown>): string {
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    for (const d of defendants) {
        if (!d || typeof d !== 'object') continue;
        const o = d as Record<string, unknown>;
        if (o.isOurClient === true || o.isClient === true) {
            const name = readStr(o, 'name') || readStr(o, 'fullName');
            if (name) return name;
        }
    }
    for (const d of defendants) {
        if (!d || typeof d !== 'object') continue;
        const name = readStr(d as Record<string, unknown>, 'name');
        if (name) return name;
    }
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    for (const c of complainants) {
        if (!c || typeof c !== 'object') continue;
        const name = readStr(c as Record<string, unknown>, 'name');
        if (name) return name;
    }
    return '';
}

function taskDateYmd(task: LegalTask): string | null {
    if (!fieldTaskHasExplicitUserDate(task)) return null;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) {
        return normalizeDateToYmd(task.reminderAt.toISOString());
    }
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) {
        return normalizeDateToYmd(task.parsedDate.toISOString());
    }
    return null;
}

function isFieldTaskCalendarEligible(task: LegalTask): boolean {
    return taskDateYmd(task) !== null;
}

/** ملاحظات المكتب + تواريخ الإضبارة المضمّنة */
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
            linkedFileId: raw.linkedFileId,
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

function loadFieldTasksRaw(): LegalTask[] {
    try {
        const blob = persistenceRepository.load(QUANTUM_TASKS_STORAGE_KEY);
        return deserializeQuantumTasks(blob);
    } catch {
        return [];
    }
}

function syncLawsuitFileLevelDates(
    file: Record<string, unknown>,
    userId: string,
    fileId: string | number,
    stats: DossierSyncStats,
    caseNo: string,
    court: string,
    parties: unknown,
    clientName: string,
): void {
    const nextDate = normalizeDateToYmd(readStr(file, 'nextDate'));
    if (nextDate) {
        void upsertCalendarFromModule({
            userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(fileId),
            sourceEventId: 'file_next_date',
            date: nextDate,
            title: 'موعد قادم — إضبارة',
            type: 'hearing',
            caseNo: caseNo || undefined,
            court: court || undefined,
            clientName: clientName || undefined,
            partiesSummary: partiesSummaryFromList(parties) || undefined,
            sourceLabel: 'دعوى مدنية — موعد قادم',
        });
        stats.lawsuitLegacy++;
    } else {
        CalendarBridge.remove('lawsuit', String(fileId), 'file_next_date', userId);
    }

    const stayReview = normalizeDateToYmd(readStr(file, 'stayReviewDate'));
    if (stayReview) {
        void upsertCalendarFromModule({
            userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(fileId),
            sourceEventId: 'stay_review_date',
            date: stayReview,
            title: 'مراجعة إيقاف الدعوى',
            type: 'deadline',
            caseNo: caseNo || undefined,
            court: court || undefined,
            clientName: clientName || undefined,
            sourceLabel: 'دعوى مدنية — مراجعة إيقاف',
        });
        stats.lawsuitLegacy++;
    } else {
        CalendarBridge.remove('lawsuit', String(fileId), 'stay_review_date', userId);
    }

    const embeddedNotes = Array.isArray(file.notes) ? file.notes : [];
    for (const n of embeddedNotes) {
        if (!isRecord(n)) continue;
        const noteId = String(n.id ?? '').trim();
        const appt = normalizeDateToYmd(readStr(n, 'apptDate'));
        if (!noteId || !appt) {
            if (noteId) CalendarBridge.remove('lawsuit', String(fileId), `note_${noteId}`, userId);
            continue;
        }
        const text = readStr(n, 'text') || 'ملاحظة إضبارة';
        void upsertCalendarFromModule({
            userId,
            sourceModule: 'lawsuit',
            sourceEntityId: String(fileId),
            sourceEventId: `note_${noteId}`,
            date: appt,
            title: text.slice(0, 80),
            type: 'consultation',
            notes: readStr(n, 'meta') || readStr(n, 'stageCtx') || undefined,
            caseNo: caseNo || undefined,
            court: court || undefined,
            clientName: clientName || undefined,
            sourceLabel: 'دعوى مدنية — ملاحظة',
        });
        stats.lawsuitLegacy++;
    }
}

function syncLawsuitLegacyHistory(
    file: Record<string, unknown>,
    userId: string,
    fileId: string | number,
    stats: DossierSyncStats,
    caseNo: string,
    court: string,
    parties: unknown,
    clientName: string,
): void {
    const stages = Array.isArray(file.stages) ? file.stages : [];
    if (stages.length > 0) return;
    const history = Array.isArray(file.history) ? file.history : [];
    for (const h of history) {
        if (!isRecord(h)) continue;
        const eventId = String(h.id ?? '').trim();
        if (eventId) {
            CalendarBridge.remove('lawsuit', String(fileId), `legacy_${eventId}`, userId);
        }
    }
    const rootTasks = Array.isArray(file.tasks) ? file.tasks : [];
    for (const t of rootTasks) {
        if (!isRecord(t)) continue;
        if (t.isCompleted) continue;
        const tid = String(t.id ?? '').trim();
        if (!tid || isEphemeralLawsuitTaskId(tid)) continue;
        syncLawsuitTaskDue({
            userId,
            fileId,
            task: {
                id: tid,
                title: readStr(t, 'title') || 'مهمة',
                dueDate: readStr(t, 'dueDate') || undefined,
                isCompleted: Boolean(t.isCompleted),
            },
            caseNo,
            court,
            parties,
        });
        if (normalizeDateToYmd(readStr(t, 'dueDate'))) stats.lawsuitTasks++;
    }
}

function criminalCaseNumber(caseRecord: Record<string, unknown>): string {
    const loc = caseRecord.location;
    if (loc && typeof loc === 'object') {
        const cn = readStr(loc as Record<string, unknown>, 'caseNumber');
        if (cn) return cn;
    }
    return readStr(caseRecord, 'courtCaseNumber') || readStr(caseRecord, 'investigationCaseNumber');
}

function dispatchCalendarUpdated(): void {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
    } catch {
        /* ignore */
    }
}

/**
 * تقليم الأحداث اليتيمة لإضبارة معيّنة:
 * يحذف من CalendarDB أي حدث جسر (`bridged`) مربوط بهذه الإضبارة
 * لكنه ليس ضمن قائمة `expectedSourceEventIds` المتوقعة بعد المزامنة.
 *
 * يُستدعى في نهاية كل sync لإضبارة لضمان أن الأحداث المحذوفة
 * من الإضبارة تُنظَّف فوراً من التقويم.
 */
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
        if (removed > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
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
        if (removed > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
        return removed;
    } catch (err) {
        debug.warn('[calendarDossierSync] removeAllBridgedEventsForEntity failed:', err);
        return 0;
    }
}

/** موعد خط زمني في دعوى مدنية — كل المراحل */
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
    task: { id: string; title: string; dueDate?: string; trashedAt?: string | null };
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

/**
 * مكتشف التواريخ الشامل: يربط أي تاريخ موجود في حقل غير كنسي داخل الإضبارة بالتقويم.
 * مصدر الحدث = field_<path> ليُميَّز من المسارات الكنسية ويحرَّر للقراءة فقط في الواجهة.
 */
function syncDiscoveredDatesForDossier(
    file: Record<string, unknown>,
    sourceModule: CalendarSourceModule,
    sourceEntityId: string | number,
    userId: string,
    extras: {
        caseNo?: string;
        court?: string;
        clientName?: string;
        partiesSummary?: string;
    },
    stats: DossierSyncStats,
): void {
    const discovered = discoverImplicitDossierDates(file, sourceModule);
    for (const d of discovered) {
        // نمرّ عبر الطابور التسلسلي لتجنّب سباق الكتابة عند اكتشاف عدة تواريخ دفعة واحدة
        fireAndForgetCalendarSync({
            userId,
            sourceModule,
            sourceEntityId: String(sourceEntityId),
            sourceEventId: d.bridgeEventId,
            date: d.dateYmd,
            title: d.title || d.pathLabel || 'تاريخ من إضبارة',
            type: d.type,
            notes: d.notes,
            caseNo: extras.caseNo,
            court: extras.court,
            clientName: extras.clientName,
            partiesSummary: extras.partiesSummary,
            sourceLabel: `${moduleLabelArSafe(sourceModule)} — ${d.pathLabel}`,
        });
        stats.discoveredDates++;
    }
}

function moduleLabelArSafe(module: CalendarSourceModule): string {
    switch (module) {
        case 'lawsuit': return 'دعوى مدنية';
        case 'execution': return 'تنفيذ';
        case 'urgent': return 'قضاء مستعجل';
        case 'transaction': return 'معاملة';
        case 'criminal': return 'جزائي';
        case 'threading': return 'معاملة إدارية';
        case 'task': return 'مهمة ميدان';
        case 'note': return 'ملاحظة';
        default: return 'موعد';
    }
}

/** تجميع معرّفات التواريخ المكتشفة لإضبارة معيّنة — لاستخدامها في تجنّب التقليم */
function collectDiscoveredBridgeIdsForFile(
    file: Record<string, unknown>,
    sourceModule: CalendarSourceModule,
    sourceEntityId: string | number,
): string[] {
    const discovered = discoverImplicitDossierDates(file, sourceModule);
    return discovered.map((d) =>
        buildStableBridgeId(sourceModule, String(sourceEntityId), d.bridgeEventId),
    );
}

function syncOneLawsuitFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    _scope: SyncScope = {},
): void {
    // 🛡️ WHITELIST صارم: للدعاوى المدنية، نُسجّل فقط "موعد جديد" (timeline.type === 'appointment')
    // — لا نُسجّل tasks/deadlines/file-level dates/legacy history/Sniffer.
    void _scope;
    const fileId = readEntityId(file);
    if (fileId === null) return;
    if (shouldExcludeLawsuitFromCalendar(file)) return;
    const caseNo = readStr(file, 'caseNo');
    const court = readStr(file, 'court');
    const parties = file.parties;
    const clientName = clientNameFromPartiesList(parties);

    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (let si = 0; si < stages.length; si++) {
        const stage = stages[si];
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const ev of timeline) {
            if (!isRecord(ev)) continue;
            if (String(ev.type || '') !== 'appointment') continue;
            const eventId = String(ev.id ?? '').trim();
            if (!eventId) continue;
            syncLawsuitTimelineAppointment({
                userId,
                fileId,
                event: {
                    id: eventId,
                    date: readStr(ev, 'date') || undefined,
                    title: readStr(ev, 'title') || undefined,
                    details: readStr(ev, 'details') || undefined,
                    isDeleted: Boolean(ev.isDeleted),
                },
                caseNo,
                court,
                parties,
                clientName,
            });
            if (!ev.isDeleted && normalizeDateToYmd(readStr(ev, 'date'))) stats.lawsuitAppointments++;
        }
        const stageId = String(stage.id ?? `stage_${si}`).trim() || `stage_${si}`;
        CalendarBridge.remove('lawsuit', String(fileId), `appeal_${stageId}`, userId);
    }
}

function syncOneExecutionFile(
    file: Record<string, unknown>,
    userId: string,
    stats: DossierSyncStats,
    _scope: SyncScope = {},
): void {
    // 🛡️ WHITELIST صارم: لقسم التنفيذ، نُسجّل فقط "إضافة موعد" (timeline.type === 'appointment')
    // — لا نُسجّل tasks/deadlines/Sniffer.
    void _scope;
    const executionId = readEntityId(file);
    if (executionId === null) return;
    if (shouldExcludeExecutionFromCalendar(file)) return;
    const caseNo =
        readStr(file, 'fileNumber') || readStr(file, 'caseNo') || readStr(file as Record<string, unknown>, 'caseNumber');
    const clientName = readStr(file, 'creditor') || readStr(file, 'clientName');

    const timeline = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        // syncExecutionTimelineAppointment يفلتر داخلياً بـ type === 'appointment'
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
}

/** يحذف أحداث مربوطة بإضبارة محذوفة/مؤرشفة/غير موجودة في التخزين */
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

function syncUrgentCases(cases: unknown[], userId: string, stats: DossierSyncStats): void {
    for (const c of cases) {
        if (!isRecord(c)) continue;
        if (c.deleted === true || c.archived === true) continue;
        if (c.phase === 'completed' || c.status === 'completed') continue;
        const caseId = String(c.id ?? '');
        if (!caseId) continue;
        const caseNo =
            readStr(c, 'requestNumber') ||
            readStr(c, 'caseNumber') ||
            readStr(c, 'caseNo');
        const applicant =
            typeof c.applicantName === 'string' ? c.applicantName.trim() : '';
        const partiesSummary =
            partiesSummaryFromList(c.parties) || applicant || '';
        const court = readStr(c, 'court') || readStr(c, 'courtName');
        const hearings = Array.isArray(c.hearings) ? c.hearings : [];

        const topSession = normalizeDateToYmd(readStr(c, 'sessionDate'));
        if (topSession) {
            void upsertCalendarFromModule({
                userId,
                sourceModule: 'urgent',
                sourceEntityId: caseId,
                sourceEventId: 'case_session_date',
                date: topSession,
                title: readStr(c, 'actionType') || readStr(c, 'specificActionType') || 'جلسة مستعجل',
                type: 'hearing',
                court,
                clientName: applicant || undefined,
                caseNo: caseNo || undefined,
                partiesSummary: partiesSummary || undefined,
                sourceLabel: 'قضاء مستعجل',
            });
            stats.urgentHearings++;
        } else {
            CalendarBridge.remove('urgent', caseId, 'case_session_date', userId);
        }

        const topDeadline =
            normalizeDateToYmd(readStr(c, 'deadlineDate')) ||
            normalizeDateToYmd(readStr(c, 'notificationDate'));
        if (topDeadline) {
            void upsertCalendarFromModule({
                userId,
                sourceModule: 'urgent',
                sourceEntityId: caseId,
                sourceEventId: 'case_deadline_date',
                date: topDeadline,
                title: 'موعد نهائي — طلب مستعجل',
                type: 'deadline',
                court,
                clientName: applicant || undefined,
                caseNo: caseNo || undefined,
                partiesSummary: partiesSummary || undefined,
                sourceLabel: 'قضاء مستعجل',
            });
            stats.urgentHearings++;
        } else {
            CalendarBridge.remove('urgent', caseId, 'case_deadline_date', userId);
        }

        const grievanceSession = normalizeDateToYmd(readStr(c, 'grievanceSessionDate'));
        if (grievanceSession) {
            void upsertCalendarFromModule({
                userId,
                sourceModule: 'urgent',
                sourceEntityId: caseId,
                sourceEventId: 'grievance_session_date',
                date: grievanceSession,
                title: 'جلسة تظلم — طلب مستعجل',
                type: 'hearing',
                court,
                clientName: applicant || undefined,
                caseNo: caseNo || undefined,
                partiesSummary: partiesSummary || undefined,
                sourceLabel: 'قضاء مستعجل — تظلم',
            });
            stats.urgentHearings++;
        } else {
            CalendarBridge.remove('urgent', caseId, 'grievance_session_date', userId);
        }

        const grievanceFirst =
            normalizeDateToYmd(readStr(c, 'grievanceFirstHearingDate')) ||
            normalizeDateToYmd(readStr(c, 'phase2FirstHearingDate'));
        if (grievanceFirst) {
            void upsertCalendarFromModule({
                userId,
                sourceModule: 'urgent',
                sourceEntityId: caseId,
                sourceEventId: 'grievance_first_hearing',
                date: grievanceFirst,
                title: 'أول جلسة تظلم — طلب مستعجل',
                type: 'hearing',
                court,
                clientName: applicant || undefined,
                caseNo: caseNo || undefined,
                partiesSummary: partiesSummary || undefined,
                sourceLabel: 'قضاء مستعجل — أول جلسة تظلم',
            });
            stats.urgentHearings++;
        } else {
            CalendarBridge.remove('urgent', caseId, 'grievance_first_hearing', userId);
        }

        for (const h of hearings) {
            if (!isRecord(h)) continue;
            const hearingId = String(h.id ?? '');
            const sessionDate = readStr(h, 'sessionDate');
            if (!hearingId || !sessionDate) continue;
            const stage = readStr(h, 'stage');
            const stageLabel =
                stage === 'grievance' ? 'تظلم' : stage === 'cassation' ? 'تمييز' : 'ما قبل القرار';
            CalendarBridge.syncUrgentHearing({
                userId,
                caseId,
                hearingId,
                sessionDate,
                stageLabel,
                notes: readStr(h, 'notes') || undefined,
                caseNo: caseNo || undefined,
                partiesSummary: partiesSummary || undefined,
                nextSessionDate: readStr(h, 'nextSessionDate') || undefined,
            });
            stats.urgentHearings++;
        }
    }
}

/** مزامنة إضبارة جزائية واحدة → التقويم (فوري بعد التعديل) */
export function syncCriminalCaseToCalendar(
    caseRecord: Record<string, unknown>,
    userId?: string | null,
): void {
    const uid = resolveCalendarUserId(userId);
    const caseId = readEntityId(caseRecord);
    if (caseId == null) return;
    if (shouldExcludeCriminalFromCalendar(caseRecord)) {
        void removeAllBridgedEventsForEntity('criminal', caseId, uid);
        return;
    }
    syncOneCriminalCase(caseRecord, uid, EMPTY_STATS());
}

/** لقطة Threading من الذاكرة أو DB */
export function syncThreadingCalendarSnapshot(
    userId: string | null | undefined,
    transactions: unknown[],
    tasks: unknown[],
): void {
    const uid = resolveCalendarUserId(userId);
    const stats = EMPTY_STATS();
    const txById = new Map<string, Record<string, unknown>>();
    for (const tx of transactions) {
        if (tx && typeof tx === 'object') {
            txById.set(String((tx as { id?: string }).id ?? ''), tx as Record<string, unknown>);
        }
    }
    for (const task of tasks) {
        if (!isRecord(task)) continue;
        const taskId = String(task.id ?? '').trim();
        const txId = String(task.transactionId ?? '').trim();
        if (!taskId || !txId) continue;
        if (String(task.status ?? '') === TransactionTaskStatus.Done) {
            CalendarBridge.remove('threading', txId, `task_${taskId}`, uid);
            continue;
        }
        const deadline = normalizeDateToYmd(typeof task.deadline === 'string' ? task.deadline : undefined);
        if (!deadline) {
            CalendarBridge.remove('threading', txId, `task_${taskId}`, uid);
            continue;
        }
        const tx = txById.get(txId);
        CalendarBridge.syncThreadingTask({
            userId: uid,
            transactionId: txId,
            taskId,
            title: readStr(task, 'title') || (tx ? readStr(tx, 'title') : '') || 'مهمة',
            dueDate: deadline,
            clientName: tx ? readStr(tx, 'clientName') || undefined : undefined,
        });
        stats.threadingTasks++;
    }
    void flushPendingCalendarSyncs();
}

function syncOneCriminalCase(caseRecord: Record<string, unknown>, userId: string, stats: DossierSyncStats): void {
    // 🛡️ WHITELIST صارم: للقضاء الجزائي، نُسجّل فقط tarikh الجلسة في تبويب المحاكمات (trials[].date)
    // — لا نُسجّل timelineEvents/location.nextHearingDate/verdict.appealDeadline/Sniffer.
    if (shouldExcludeCriminalFromCalendar(caseRecord)) return;
    const caseId = String(caseRecord.id ?? '').trim();
    if (!caseId) return;

    const caseNo = criminalCaseNumber(caseRecord);
    const clientName = criminalClientName(caseRecord) || undefined;

    // 🧹 جمع الـ sourceEventIds المتوقعة بعد المزامنة — لـ pruning أي حدث يتيم
    const expectedIds = new Set<string>();

    const trials = Array.isArray(caseRecord.trials) ? caseRecord.trials : [];
    for (const session of trials) {
        if (!isRecord(session)) continue;
        const sessionId = String(session.id ?? '').trim();
        const date = normalizeDateToYmd(readStr(session, 'date'));
        if (!sessionId || !date) continue;
        expectedIds.add(`trial_${sessionId}`);
        const nextSes = normalizeDateToYmd(readStr(session, 'nextSessionDate'));
        if (nextSes && nextSes !== date) expectedIds.add(`trial_${sessionId}_next`);
        const sessionNo = readStr(session, 'sessionNumber');
        const title = sessionNo ? `جلسة محاكمة ${sessionNo}` : 'جلسة محاكمة';
        CalendarBridge.syncCriminalTrialSession({
            userId,
            caseId,
            sessionId,
            date,
            title,
            nextSessionDate: readStr(session, 'nextSessionDate') || undefined,
            caseNo: caseNo || undefined,
            clientName,
        });
        stats.criminalTrials++;
        if (nextSes && nextSes !== date) stats.criminalTrials++;
    }

    // 🧹 احذف صراحةً كل المسارات السابقة الملغاة (timelineEvents/location/verdict)
    // — مفيد للقضايا التي حُفظت قبل تفعيل الـ whitelist.
    const timeline = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        const eventId = String(ev.id ?? '').trim();
        if (eventId) CalendarBridge.remove('criminal', caseId, eventId, userId);
    }
    CalendarBridge.remove('criminal', caseId, 'location_next_hearing', userId);
    const verdictCards = Array.isArray(caseRecord.verdictCards) ? caseRecord.verdictCards : [];
    for (const card of verdictCards) {
        if (!isRecord(card)) continue;
        const cardId = String(card.id ?? '').trim();
        if (cardId) CalendarBridge.remove('criminal', caseId, `verdict_appeal_${cardId}`, userId);
    }
    for (const session of trials) {
        if (!isRecord(session)) continue;
        const sessionId = String(session.id ?? '').trim();
        if (sessionId) {
            CalendarBridge.remove('criminal', caseId, `trial_verdict_appeal_${sessionId}`, userId);
        }
    }

    // 🧹 Pruning: احذف أي حدث في CalendarDB لا ينتمي لـ expectedIds (Sniffer/orphans/legacy)
    void pruneOrphanedBridgedEventsForEntity('criminal', caseId, expectedIds, userId);
}

function syncCriminalCases(userId: string, stats: DossierSyncStats): void {
    for (const raw of loadCriminalCasesRaw()) {
        if (isRecord(raw)) syncOneCriminalCase(raw, userId, stats);
    }
}

async function syncThreadingTasks(userId: string, stats: DossierSyncStats): Promise<void> {
    try {
        const state = await TransactionsThreadingDB.getState(userId);
        const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
        const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
        const txById = new Map<string, Record<string, unknown>>();
        for (const tx of transactions) {
            if (tx && typeof tx === 'object') txById.set(String((tx as { id?: string }).id ?? ''), tx as Record<string, unknown>);
        }
        for (const task of tasks) {
            if (!isRecord(task)) continue;
            const taskId = String(task.id ?? '').trim();
            const txId = String(task.transactionId ?? '').trim();
            if (!taskId || !txId) continue;
            if (String(task.status ?? '') === TransactionTaskStatus.Done) continue;
            const deadline = normalizeDateToYmd(
                typeof task.deadline === 'string' ? task.deadline : undefined,
            );
            if (!deadline) continue;
            const tx = txById.get(txId);
            const clientName = tx ? readStr(tx, 'clientName') || undefined : undefined;
            const txTitle = tx ? readStr(tx, 'title') : '';
            CalendarBridge.syncThreadingTask({
                userId,
                transactionId: txId,
                taskId,
                title: readStr(task, 'title') || txTitle || 'مهمة',
                dueDate: deadline,
                clientName,
            });
            stats.threadingTasks++;
        }
    } catch (err) {
        debug.warn('[calendarDossierSync] threading scan failed:', err);
    }
}

async function syncTransactions(userId: string, stats: DossierSyncStats): Promise<void> {
    try {
        const list = (await TransactionDB.getTransactions(userId)) as unknown[];
        for (const tx of list) {
            if (!isRecord(tx)) continue;
            const txId = String(tx.id ?? '');
            if (!txId) continue;
            const steps = Array.isArray(tx.steps) ? tx.steps : [];
            for (const s of steps) {
                if (!isRecord(s)) continue;
                const stepId = String(s.id ?? '');
                const appt = s.appointmentDate;
                if (!stepId || !appt) continue;
                const label = readStr(s, 'label') || 'خطوة';
                const title = `${readStr(tx, 'transactionType') || 'معاملة'} — ${label}`;
                CalendarBridge.syncTransactionAppointment({
                    userId,
                    transactionId: txId,
                    stepId,
                    date: appt instanceof Date ? appt : String(appt),
                    time: typeof s.appointmentTime === 'string' ? s.appointmentTime : undefined,
                    title,
                    clientName: readStr(tx, 'clientName') || undefined,
                });
                stats.transactionSteps++;
            }
        }
    } catch (err) {
        debug.warn('[calendarDossierSync] transactions scan failed:', err);
    }
}

let reconcileInFlight: Promise<DossierSyncStats> | null = null;

const EMPTY_STATS = (): DossierSyncStats => ({
    lawsuitAppointments: 0,
    lawsuitTasks: 0,
    lawsuitDeadlines: 0,
    executionAppointments: 0,
    executionTasks: 0,
    urgentHearings: 0,
    transactionSteps: 0,
    criminalTimeline: 0,
    criminalTrials: 0,
    threadingTasks: 0,
    globalNotes: 0,
    fieldTasks: 0,
    lawsuitLegacy: 0,
    discoveredDates: 0,
    prunedOrphans: 0,
    purgedInactive: 0,
});

function findLawsuitFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadLawsuitFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
}

function findExecutionFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadExecutionFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
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

async function finishDossierCalendarSync(
    userId: string,
    scope: SyncScope = {},
    live?: LiveCalendarSnapshots,
): Promise<void> {
    await flushPendingCalendarSyncs();
    const includeTasks = scope.includeTasks ?? true;
    await pruneOrphanedBridgeEvents(userId, { includeTasks, live });
    dispatchCalendarUpdated();
}

/**
 * مزامنة دفعة دعاوى + تنفيذ (جلسات + مهام استحقاق بتاريخ) — للتحديث التلقائي في اللوحة.
 */
export function syncDossierFilesIncremental(
    userId: string | null | undefined,
    lawsuitFiles: unknown[],
    executionFiles: unknown[],
): void {
    void ensureCalendarPopulatedFromLiveDossiers({
        lawyerId: userId,
        lawsuitFiles,
        executionFiles,
    });
}

let livePopulateInFlight: Promise<void> | null = null;
let latestLivePopulateParams: {
    lawyerId: string | null | undefined;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
} | null = null;

async function runLiveCalendarPopulate(params: {
    lawyerId: string | null | undefined;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
}): Promise<void> {
    // 🛡️ WHITELIST صارم — نُسجّل فقط 4 نقاط دخول صريحة:
    //   1) المدني — "موعد جديد" (timeline.type='appointment')
    //   2) الجزائي — تاريخ الجلسة في تبويب المحاكمات (trials[].date / nextSessionDate)
    //   3) التنفيذ — "إضافة موعد" (timeline.type='appointment')
    //   4) المعاملات — مهلة المهمة في AddTaskBottomSheet (threading.tasks[].deadline)
    // كل ما عداه (notes/field-tasks/urgent/transactions/Sniffer) مُعطَّل.
    const uid = resolveCalendarUserId(params.lawyerId);
    const stats = EMPTY_STATS();

    for (const raw of params.lawsuitFiles) {
        if (isRecord(raw)) syncOneLawsuitFile(raw, uid, stats);
    }
    for (const raw of params.executionFiles) {
        if (isRecord(raw)) syncOneExecutionFile(raw, uid, stats);
    }
    for (const raw of params.criminalCases ?? []) {
        if (isRecord(raw)) syncOneCriminalCase(raw, uid, stats);
    }

    // ✅ Threading tasks (مهل مهام المعاملات) — مسموح
    try {
        const threading = await TransactionsThreadingDB.getState(uid);
        syncThreadingCalendarSnapshot(
            uid,
            Array.isArray(threading?.transactions) ? threading.transactions : [],
            Array.isArray(threading?.tasks) ? threading.tasks : [],
        );
    } catch (err) {
        debug.warn('[calendarDossierSync] threading live sync failed:', err);
    }

    // 🚫 المسارات المُلغاة (لا تُسجَّل في التقويم/البطاقة):
    //    - UrgentActionsDB.cases     → syncUrgentCases
    //    - TransactionDB.steps        → syncTransactions
    //    - globalNotes                → syncGlobalNotesToCalendar
    //    - fieldTasks (مهام الميدان)  → syncFieldTasksToCalendar
    // (المتغيرات unused مقصودة — تخدم التوثيق + الاختبارات)
    void params.globalNotes;
    void params.fieldTasks;

    await flushPendingCalendarSyncs();

    // 🧹 ضمان نظافة CalendarDB من أي بقايا لمسارات مُلغاة سابقاً
    await purgeNonWhitelistedBridgedEvents(uid);

    dispatchCalendarUpdated();
}

/**
 * يرفع مواعيد الإضابير الحية (من الذاكرة) إلى CalendarDB قبل التنبيهات والرادار.
 * يجب await قبل قراءة CalendarDB في SecretaryOrchestrator.
 */
export async function ensureCalendarPopulatedFromLiveDossiers(params: {
    lawyerId: string | null | undefined;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    globalNotes?: unknown[];
    fieldTasks?: LegalTask[];
}): Promise<void> {
    latestLivePopulateParams = params;
    if (livePopulateInFlight) return livePopulateInFlight;

    livePopulateInFlight = (async () => {
        try {
            while (latestLivePopulateParams) {
                const batch = latestLivePopulateParams;
                latestLivePopulateParams = null;
                await runLiveCalendarPopulate(batch);
            }
        } finally {
            livePopulateInFlight = null;
            if (latestLivePopulateParams) {
                void ensureCalendarPopulatedFromLiveDossiers(latestLivePopulateParams);
            }
        }
    })();

    return livePopulateInFlight;
}

/** بعد حفظ/استرجاع إضبارة دعوى: رفع المواعيد الحقيقية فقط + تنظيف اليتامى */
export function syncLawsuitFileToCalendar(file: Record<string, unknown>, userId?: string | null): void {
    const uid = resolveCalendarUserId(userId);
    void (async () => {
        const entityId = isRecord(file) ? readEntityId(file) : null;
        if (entityId != null) {
            if (shouldExcludeLawsuitFromCalendar(file)) {
                await removeAllBridgedEventsForEntity('lawsuit', entityId, uid);
                await flushPendingCalendarSyncs();
                await pruneOrphanedBridgeEvents(uid, { includeTasks: false, live: { lawsuitFiles: [file] } });
                dispatchCalendarUpdated();
                return;
            }
            syncOneLawsuitFile(file, uid, EMPTY_STATS(), { includeTasks: true });
        }
        await finishDossierCalendarSync(uid, { includeTasks: true }, { lawsuitFiles: [file] });
    })();
}

/** مزامنة إضبارة تنفيذ واحدة فور حفظها أو استرجاعها */
export function syncExecutionFileToCalendar(
    file: Record<string, unknown>,
    userId?: string | null,
): void {
    const uid = resolveCalendarUserId(userId);
    void (async () => {
        const entityId = isRecord(file) ? readEntityId(file) : null;
        if (entityId != null) {
            if (shouldExcludeExecutionFromCalendar(file)) {
                await removeAllBridgedEventsForEntity('execution', entityId, uid);
                await flushPendingCalendarSyncs();
                await pruneOrphanedBridgeEvents(uid, { includeTasks: false, live: { executionFiles: [file] } });
                dispatchCalendarUpdated();
                return;
            }
            syncOneExecutionFile(file, uid, EMPTY_STATS(), { includeTasks: true });
        }
        await finishDossierCalendarSync(uid, { includeTasks: true }, { executionFiles: [file] });
    })();
}

/**
 * تنظيف عميق ثم مزامنة — يُستدعى عند فتح التقويم.
 * يزيل المحذوف/المؤرشف/اليتامى والمهام التلقائية قبل إعادة رفع الجلسات الحقيقية فقط.
 */
/**
 * 🛡️ WHITELIST cleanup — يزيل من التقويم كل حدث مربوط بمصدر/نوع لم يَعُد ضمن الـ whitelist:
 *  - sourceModule: urgent / transaction / note / task (مهام ميدان)
 *  - sourceEventId: field_* (Sniffer)
 *  - sourceEventId: legacy_* / appeal_* / verdict_appeal_* / trial_verdict_appeal_*
 *  - sourceEventId: location_next_hearing (criminal)
 *  - sourceModule=lawsuit مع sourceEventId يبدأ بـ task_ (مهام مدنية)
 *  - sourceModule=execution مع sourceEventId يبدأ بـ task_ (مهام تنفيذ)
 *  - sourceModule=criminal مع sourceEventId لا يبدأ بـ trial_ (timelineEvents)
 */
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

export async function cleanupCalendarForUser(userId?: string | null): Promise<DossierSyncStats> {
    const uid = resolveCalendarUserId(userId);
    const preStats = EMPTY_STATS();
    preStats.prunedOrphans = await purgeInauthenticBridgedEvents(uid);
    preStats.prunedOrphans += await purgeNonWhitelistedBridgedEvents(uid);
    preStats.purgedInactive = await purgeExcludedDossierBridgedEvents(uid);
    preStats.prunedOrphans += await pruneOrphanedBridgeEvents(uid, { includeTasks: false });
    preStats.purgedInactive += await purgeInactiveEntityBridgedEvents(uid);
    const stats = await reconcileAllDossierDates(uid);
    stats.prunedOrphans += preStats.prunedOrphans;
    stats.purgedInactive += preStats.purgedInactive;
    stats.purgedInactive += await purgeExcludedDossierBridgedEvents(uid);
    return stats;
}

/**
 * يمسح كل الإضابير المحلية ويرفع المواعيد/المهام ذات التاريخ إلى التقويم (آمن للتكرار).
 */
export async function reconcileAllDossierDates(userId?: string | null): Promise<DossierSyncStats> {
    if (reconcileInFlight) {
        return reconcileInFlight;
    }

    const uid = resolveCalendarUserId(userId);
    reconcileInFlight = (async () => {
        const stats = EMPTY_STATS();

        const bulkScope: SyncScope = { includeTasks: true };

        try {
            stats.prunedOrphans += await pruneOrphanedBridgeEvents(uid, { includeTasks: true });
            stats.purgedInactive += await purgeInactiveEntityBridgedEvents(uid);

            // 🛡️ WHITELIST: فقط 4 نقاط دخول مسموحة
            for (const raw of loadLawsuitFilesRaw()) {
                if (isRecord(raw)) syncOneLawsuitFile(raw, uid, stats, bulkScope);
            }
            for (const raw of loadExecutionFilesRaw()) {
                if (isRecord(raw)) syncOneExecutionFile(raw, uid, stats, bulkScope);
            }
            syncCriminalCases(uid, stats);
            await syncThreadingTasks(uid, stats);

            // 🚫 المعطّلة: urgent/transactions/globalNotes/fieldTasks/Sniffer
            //   نُنظّف ما قد يكون مُسجَّلاً سابقاً منها عبر pruneOrphan + purgeInauthentic

            await flushPendingCalendarSyncs();
            stats.purgedInactive += await purgeExcludedDossierBridgedEvents(uid);
            stats.prunedOrphans += await purgeInauthenticBridgedEvents(uid);
            stats.prunedOrphans += await purgeNonWhitelistedBridgedEvents(uid);
            stats.prunedOrphans += await pruneOrphanedBridgeEvents(uid, { includeTasks: true });
            dispatchCalendarUpdated();
        } finally {
            reconcileInFlight = null;
        }

        return stats;
    })();

    return reconcileInFlight;
}

/** قواعد ما يُرفع للتقويم — مرجع للفحص والاختبارات */
export const CALENDAR_SYNC_RULES = {
    lawsuit: [
        'timeline.appointment — جلسات',
        'tasks.dueDate — مهام استحقاق يدوية (باستثناء task_fast_/auto_)',
        'history.date — سجل قديم بدون stages',
        'nextDate / stayReviewDate — مواعيد علوية',
        'notes[].apptDate — ملاحظات مضمّنة',
    ],
    execution: [
        'timelineEvents.appointment (غير محذوف)',
        'caseTasksPending.dueDate — مهام الاستحقاق',
    ],
    urgent: [
        'hearings.sessionDate',
        'hearings.nextSessionDate',
        'sessionDate / deadlineDate / notificationDate على مستوى القضية',
        'grievanceSessionDate / grievanceFirstHearingDate / phase2FirstHearingDate',
    ],
    transaction: ['steps.appointmentDate'],
    criminal: [
        'timelineEvents.date',
        'timelineEvents.nextDate',
        'trials.date',
        'trials.nextSessionDate',
        'location.nextHearingDate',
    ],
    threading: ['tasks.deadline للمهام غير المكتملة'],
    note: ['globalNotes apptDate / reminder_at / date'],
    task: ['quantum field tasks parsedDate / reminderAt'],
    /**
     * شبكة الأمان الشاملة (Universal Date Sniffer):
     * بعد المسارات الكنسية أعلاه، يمشّط مكتشف التواريخ كل بنية إضبارة بحثاً
     * عن أي حقل تاريخ في **أي حاوية فرعية** لم يُغطَّ صراحةً.
     *
     * - يلتقط: أي مفتاح ينتهي بـ Date / Deadline أو يُسمّى date ضمن سياق إضباري.
     * - يستبعد: مفاتيح الميتا (createdAt/updatedAt/trashedAt/...) وحقول الميلاد والبيانات الشخصية.
     * - يستبعد: المسارات الكنسية أعلاه (تفادي التكرار).
     * - معرّف الجسر: field_<safe_path> — مميَّز، للقراءة فقط من جهة التقويم.
     * - التحرير/الحذف من التقويم: ممنوع — يُرشد المستخدم لتحريرها من إضبارتها الأصلية.
     */
    sniffer: [
        'أي *Date / dueDate / *Deadline / date في أي حاوية فرعية',
        'بأي عمق — حتى داخل tabs/sub-records غير معروفة',
        'تُربط بمصدرها (module + entityId) ومعرّف path-stable',
    ],
} as const;
