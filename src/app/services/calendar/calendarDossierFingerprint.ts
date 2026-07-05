import type { LegalTask } from '@/app/types/TaskEngine';

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
    const parts: string[] = [id, status, caseNo];
    const stages = Array.isArray(file.stages) ? file.stages : [];
    for (const stage of stages) {
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

/** بصمة الإضابير — تُستخدم لمزامنة التقويم و reconcile الذكي */
export function buildCalendarDossierFingerprint(
    lawsuitFiles: unknown[] = [],
    executionFiles: unknown[] = [],
    _globalNotes: unknown[] = [],
    _fieldTasks: LegalTask[] = [],
    criminalCases: unknown[] = [],
): string {
    void _globalNotes;
    void _fieldTasks;
    return `${buildDossierFilesFingerprint(lawsuitFiles, executionFiles)}##${buildCriminalFingerprint(criminalCases)}`;
}
