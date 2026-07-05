import { useEffect, useMemo, useRef } from 'react';
import { CRIMINAL_STORAGE_PATCHED_EVENT } from '@/app/utils/criminalCasesStorage';
import { ensureCalendarPopulatedFromLiveDossiers } from '@/app/services/calendarDossierSync';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import {
    clearDossierSyncFingerprint,
    markDossierSyncFingerprint,
    shouldSkipDossierSyncForFingerprint,
} from '@/app/services/calendar/calendarDossierSyncState';
import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import type { LegalTask } from '@/app/types/TaskEngine';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';

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

function runIncrementalSync(lawyerId: string, payload: SyncPayload, fingerprint: string): void {
    if (shouldSkipDossierSyncForFingerprint(lawyerId, fingerprint)) return;
    lastPayloadByLawyer.set(lawyerId, payload);
    void ensureCalendarPopulatedFromLiveDossiers({
        lawyerId,
        lawsuitFiles: payload.lawsuitFiles,
        executionFiles: payload.executionFiles,
        criminalCases: payload.criminalCases,
        globalNotes: payload.globalNotes,
        fieldTasks: payload.fieldTasks,
    }).then(() => {
        markDossierSyncFingerprint(lawyerId, fingerprint);
    });
}

function scheduleIncrementalSync(lawyerId: string, payload: SyncPayload, fingerprint: string): void {
    lastPayloadByLawyer.set(lawyerId, payload);
    const prev = timers.get(lawyerId);
    if (prev) clearTimeout(prev);
    timers.set(
        lawyerId,
        setTimeout(() => {
            timers.delete(lawyerId);
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            runIncrementalSync(lawyerId, latest, fingerprint);
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
            buildCalendarDossierFingerprint(
                lawsuitFiles,
                executionFiles,
                globalNotes,
                fieldTasks,
                criminalCases,
            ),
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
        scheduleIncrementalSync(lawyerId, payload, dossierFingerprint);

        const onCriminalStoragePatched = () => {
            if (!mountedRef.current || !lawyerId) return;
            clearDossierSyncFingerprint(lawyerId);
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            scheduleIncrementalSync(lawyerId, latest, dossierFingerprint);
        };

        const onQuantumTasks = () => {
            if (!mountedRef.current || !lawyerId) return;
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            scheduleIncrementalSync(
                lawyerId,
                {
                    ...latest,
                    fieldTasks: getQuantumPendingSnapshot(),
                },
                dossierFingerprint,
            );
        };
        const onCalendarRequest = () => {
            if (!mountedRef.current || !lawyerId) return;
            if (shouldSkipDossierSyncForFingerprint(lawyerId, dossierFingerprint)) return;
            scheduleIncrementalSync(
                lawyerId,
                lastPayloadByLawyer.get(lawyerId) ?? payload,
                dossierFingerprint,
            );
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
    scheduleIncrementalSync(lawyerId, latest, buildCalendarDossierFingerprint());
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
    const fingerprint = buildCalendarDossierFingerprint(
        lawsuitFiles,
        executionFiles,
        globalNotes,
        fieldTasks,
        criminalCases,
    );
    clearDossierSyncFingerprint(lawyerId);
    scheduleIncrementalSync(
        lawyerId,
        {
            lawsuitFiles,
            executionFiles,
            globalNotes,
            fieldTasks,
            criminalCases,
        },
        fingerprint,
    );
}
