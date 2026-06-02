import { useEffect, useMemo, useRef } from 'react';
import { CRIMINAL_STORAGE_PATCHED_EVENT } from '@/app/utils/criminalCasesStorage';
import { ensureCalendarPopulatedFromLiveDossiers } from '@/app/services/calendarDossierSync';
import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import type { LegalTask } from '@/app/types/TaskEngine';

const DEBOUNCE_MS = 500;
export const QUANTUM_TASKS_CHANGED_EVENT = 'hami:quantum-tasks-changed';

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastPayloadByLawyer = new Map<string, SyncPayload>();

type SyncPayload = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    globalNotes: unknown[];
    fieldTasks: LegalTask[];
    criminalCases: unknown[];
};

function runIncrementalSync(lawyerId: string, payload: SyncPayload): void {
    lastPayloadByLawyer.set(lawyerId, payload);
    void ensureCalendarPopulatedFromLiveDossiers({
        lawyerId,
        lawsuitFiles: payload.lawsuitFiles,
        executionFiles: payload.executionFiles,
        criminalCases: payload.criminalCases,
        globalNotes: payload.globalNotes,
        fieldTasks: payload.fieldTasks,
    });
}

function scheduleIncrementalSync(lawyerId: string, payload: SyncPayload): void {
    lastPayloadByLawyer.set(lawyerId, payload);
    const prev = timers.get(lawyerId);
    if (prev) clearTimeout(prev);
    timers.set(
        lawyerId,
        setTimeout(() => {
            timers.delete(lawyerId);
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            runIncrementalSync(lawyerId, latest);
        }, DEBOUNCE_MS),
    );
}

/**
 * مزامنة فورية (مؤجّلة) → التقويم → التنبيهات:
 * دعاوى، تنفيذ (مع مهام الاستحقاق)، جزائي (يُمرَّر من الجسر)، Threading.
 */
export function useIncrementalCalendarSync(
    lawyerId: string | null | undefined,
    lawsuitFiles: unknown[] = [],
    executionFiles: unknown[] = [],
    globalNotes: unknown[] = [],
    fieldTasks: LegalTask[] = [],
    criminalCases: unknown[] = [],
): void {
    const mountedRef = useRef(true);
    const payload = useMemo(
        (): SyncPayload => ({
            lawsuitFiles,
            executionFiles,
            globalNotes,
            fieldTasks,
            criminalCases,
        }),
        [lawsuitFiles, executionFiles, globalNotes, fieldTasks, criminalCases],
    );

    const dossierFingerprint = useMemo(
        () =>
            `${buildDossierFingerprint(lawsuitFiles, executionFiles)}##${buildNotesFingerprint(globalNotes)}##${buildFieldTasksFingerprint(fieldTasks)}##${criminalCases.length}`,
        [lawsuitFiles, executionFiles, globalNotes, fieldTasks, criminalCases],
    );

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!lawyerId) return;
        scheduleIncrementalSync(lawyerId, payload);

        const onCriminalStoragePatched = () => {
            if (!mountedRef.current || !lawyerId) return;
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            scheduleIncrementalSync(lawyerId, latest);
        };

        const onQuantumTasks = () => {
            if (!mountedRef.current || !lawyerId) return;
            scheduleIncrementalSync(lawyerId, lastPayloadByLawyer.get(lawyerId) ?? payload);
        };
        const onCalendarRequest = () => {
            if (!mountedRef.current || !lawyerId) return;
            scheduleIncrementalSync(lawyerId, lastPayloadByLawyer.get(lawyerId) ?? payload);
        };
        window.addEventListener(QUANTUM_TASKS_CHANGED_EVENT, onQuantumTasks);
        window.addEventListener(CALENDAR_REQUEST_SYNC_EVENT, onCalendarRequest);
        window.addEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, onCriminalStoragePatched);

        return () => {
            window.removeEventListener(QUANTUM_TASKS_CHANGED_EVENT, onQuantumTasks);
            window.removeEventListener(CALENDAR_REQUEST_SYNC_EVENT, onCalendarRequest);
            window.removeEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, onCriminalStoragePatched);
            const t = timers.get(lawyerId);
            if (t) clearTimeout(t);
            timers.delete(lawyerId);
        };
    }, [lawyerId, dossierFingerprint, payload]);
}

/** يُستدعى بعد حفظ مهمة/معاملة Threading */
export function bumpThreadingCalendarSync(lawyerId: string | null | undefined): void {
    if (!lawyerId) return;
    const latest = lastPayloadByLawyer.get(lawyerId) ?? {
        lawsuitFiles: [],
        executionFiles: [],
        globalNotes: [],
        fieldTasks: [],
        criminalCases: [],
    };
    scheduleIncrementalSync(lawyerId, latest);
}

/** يُستدعى بعد حفظ إضبارة دعوى أو تنفيذ */
export function bumpDossierCalendarSync(
    lawyerId: string | null | undefined,
    lawsuitFiles: unknown[],
    executionFiles: unknown[],
    globalNotes: unknown[] = [],
    fieldTasks: LegalTask[] = [],
    criminalCases: unknown[] = [],
): void {
    if (!lawyerId) return;
    scheduleIncrementalSync(lawyerId, {
        lawsuitFiles,
        executionFiles,
        globalNotes,
        fieldTasks,
        criminalCases,
    });
}

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

function buildNotesFingerprint(notes: unknown[]): string {
    return notes
        .filter(isRecord)
        .map((n) => {
            const id = String(n.id ?? '');
            return `${id}:${readStr(n, 'apptDate')}:${readStr(n, 'reminder_at')}:${readStr(n, 'date')}`;
        })
        .sort()
        .join('|');
}

function buildFieldTasksFingerprint(tasks: LegalTask[]): string {
    return tasks
        .map((t) => {
            const ymd = t.parsedDate?.toISOString().slice(0, 10) ?? '';
            const rem = t.reminderAt?.toISOString().slice(0, 10) ?? '';
            return `${t.id}:${t.status}:${ymd}:${rem}:${t.pinnedToFieldCurtain ? 1 : 0}`;
        })
        .sort()
        .join('|');
}

function buildDossierFingerprint(lawsuitFiles: unknown[], executionFiles: unknown[]): string {
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
