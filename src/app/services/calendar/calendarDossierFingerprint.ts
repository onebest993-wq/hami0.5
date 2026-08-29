import type { LegalTask } from '@/app/types/TaskEngine';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/lite';
import { fieldTaskHasExplicitUserDate } from '@/app/services/calendarAuthenticity';
import { collectStageLegalCalendarSpecs } from '@/app/services/lawsuitTimelineCalendarMirror';
import { resolveNextExecutionVisitation } from '@/app/services/calendar/dossierSync/visitationCalendarSync';

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function readStr(o: Record<string, unknown>, key: string): string {
    const v = o[key];
    return typeof v === 'string' ? v.trim() : '';
}

function lawsuitFileFingerprint(file: Record<string, unknown>): string {
    const id = String(file.id ?? '');
    const status = String(file.status ?? '');
    const caseNo = readStr(file, 'caseNo');
    const parts: string[] = [
        id,
        status,
        caseNo,
        readStr(file, 'nextDate'),
        readStr(file, 'stayReviewDate'),
        readStr(file, 'firstHearingDate'),
    ];
    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (let si = 0; si < stages.length; si++) {
        const stage = stages[si];
        if (!isRecord(stage)) continue;
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const ev of timeline) {
            if (!isRecord(ev)) continue;
            if (String(ev.type) !== 'appointment') continue;
            parts.push(`a:${ev.id}:${readStr(ev, 'date')}:${ev.isDeleted ? '1' : '0'}`);
        }
        const tasks = Array.isArray(stage.tasks) ? stage.tasks : [];
        for (const t of tasks) {
            if (!isRecord(t)) continue;
            parts.push(`t:${t.id}:${readStr(t, 'dueDate')}:${t.isCompleted ? '1' : '0'}`);
        }
        for (const spec of collectStageLegalCalendarSpecs(stage, si)) {
            parts.push(`l:${spec.id}:${spec.date ?? ''}`);
        }
    }
    const embeddedNotes = Array.isArray(file.notes) ? file.notes : [];
    for (const n of embeddedNotes) {
        if (!isRecord(n)) continue;
        parts.push(`n:${n.id}:${readStr(n, 'apptDate')}`);
    }
    return parts.join(';');
}

function executionFileFingerprint(file: Record<string, unknown>): string {
    const id = String(file.id ?? '');
    const status = String(file.status ?? '');
    const trash = readStr(file, 'executionTrashDeletedAt');
    const parts: string[] = [id, status, trash];
    const timeline = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    for (const ev of timeline) {
        if (!isRecord(ev)) continue;
        parts.push(`a:${ev.id}:${readStr(ev, 'date')}:${ev.trashedAt ? '1' : '0'}:${ev.type}`);
    }
    const tasks = Array.isArray(file.caseTasksPending) ? file.caseTasksPending : [];
    for (const t of tasks) {
        if (!isRecord(t)) continue;
        parts.push(`t:${t.id}:${readStr(t, 'dueDate')}:${t.isCompleted ? '1' : '0'}`);
    }
    const visit = resolveNextExecutionVisitation(file);
    parts.push(`v:${visit?.date ?? ''}:${visit?.time ?? ''}:${visit?.location ?? ''}`);
    return parts.join(';');
}

function criminalCaseFingerprint(c: Record<string, unknown>): string {
    const id = String(c.id ?? '');
    const parts: string[] = [id, readStr(c, 'nextSessionDate')];
    const trials = Array.isArray(c.trials) ? c.trials : [];
    for (const trial of trials) {
        if (!isRecord(trial)) continue;
        parts.push(`t:${trial.id}:${readStr(trial, 'date')}:${readStr(trial, 'nextSessionDate')}`);
    }
    return parts.join(';');
}

function fieldTaskFingerprint(task: LegalTask): string {
    if (!fieldTaskHasExplicitUserDate(task)) {
        return `${task.id}:0`;
    }
    const ymd =
        (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())
            ? normalizeDateToYmd(task.reminderAt.toISOString())
            : null) ||
        (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())
            ? normalizeDateToYmd(task.parsedDate.toISOString())
            : null) ||
        '';
    const loc = (task.location ?? '').trim();
    return `${task.id}:${ymd}:${task.status}:${loc}:${task.isFatalDeadline ? '1' : '0'}`;
}

function buildDossierFilesFingerprint(lawsuitFiles: unknown[], executionFiles: unknown[]): string {
    const l = lawsuitFiles
        .filter(isRecord)
        .map(lawsuitFileFingerprint)
        .sort()
        .join('||');
    const e = executionFiles
        .filter(isRecord)
        .map(executionFileFingerprint)
        .sort()
        .join('||');
    return `${l}##${e}`;
}

function buildCriminalFingerprint(criminalCases: unknown[]): string {
    return criminalCases
        .filter(isRecord)
        .map(criminalCaseFingerprint)
        .sort()
        .join('||');
}

function buildFieldTasksFingerprint(fieldTasks: LegalTask[]): string {
    return fieldTasks
        .filter(fieldTaskHasExplicitUserDate)
        .map(fieldTaskFingerprint)
        .sort()
        .join('|');
}

/** بصمة الإضابير — تُستخدم لمزامنة التقويم و reconcile الذكي */
export function buildCalendarDossierFingerprint(
    lawsuitFiles: unknown[] = [],
    executionFiles: unknown[] = [],
    _globalNotes: unknown[] = [],
    fieldTasks: LegalTask[] = [],
    criminalCases: unknown[] = [],
): string {
    void _globalNotes;
    return `${buildDossierFilesFingerprint(lawsuitFiles, executionFiles)}##${buildCriminalFingerprint(criminalCases)}##ft:${buildFieldTasksFingerprint(fieldTasks)}`;
}
