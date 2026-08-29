import { useEffect, useMemo, useRef } from 'react';
import { CRIMINAL_STORAGE_PATCHED_EVENT } from '@/app/utils/criminalCasesStorage';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import {
    clearDossierSyncFingerprint,
    markDossierSyncFingerprint,
    shouldSkipDossierSyncForFingerprint,
} from '@/app/services/calendar/calendarDossierSyncState';
import {
    CALENDAR_BACKGROUND_SYNC_FAILED_EVENT,
    CALENDAR_REQUEST_SYNC_EVENT,
} from '@/app/services/calendarBridge.types';
import { reportCalendarBridgeSyncFailure } from '@/app/services/calendar/calendarSentryReporting';
import type { LegalTask } from '@/app/types/TaskEngine';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/utils/quantumTasksEvents';

const DEBOUNCE_MS = 500;
const LIVE_POPULATE_RETRY_MS = 8_000;
const LIVE_POPULATE_RETRY_MAX = 3;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastPayloadByLawyer = new Map<string, SyncPayload>();
const livePopulateRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const livePopulateRetryCount = new Map<string, number>();

type SyncPayload = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    globalNotes: unknown[];
    fieldTasks: LegalTask[];
    criminalCases: unknown[];
};

function fingerprintOf(payload: SyncPayload): string {
    return buildCalendarDossierFingerprint(
        payload.lawsuitFiles,
        payload.executionFiles,
        payload.globalNotes,
        payload.fieldTasks,
        payload.criminalCases,
    );
}

function clearLivePopulateRetry(lawyerId: string): void {
    const t = livePopulateRetryTimers.get(lawyerId);
    if (t) clearTimeout(t);
    livePopulateRetryTimers.delete(lawyerId);
}

function resetLivePopulateRetryBudget(lawyerId: string): void {
    clearLivePopulateRetry(lawyerId);
    livePopulateRetryCount.delete(lawyerId);
}

function scheduleLivePopulateRetry(lawyerId: string, fingerprint: string): void {
    const n = livePopulateRetryCount.get(lawyerId) ?? 0;
    if (n >= LIVE_POPULATE_RETRY_MAX) return;
    if (livePopulateRetryTimers.has(lawyerId)) return;
    livePopulateRetryCount.set(lawyerId, n + 1);
    livePopulateRetryTimers.set(
        lawyerId,
        setTimeout(() => {
            livePopulateRetryTimers.delete(lawyerId);
            const latest = lastPayloadByLawyer.get(lawyerId);
            if (!latest) return;
            runIncrementalSync(lawyerId, latest, fingerprint);
        }, LIVE_POPULATE_RETRY_MS),
    );
}

function runIncrementalSync(lawyerId: string, payload: SyncPayload, fingerprint: string): void {
    if (shouldSkipDossierSyncForFingerprint(lawyerId, fingerprint)) return;
    lastPayloadByLawyer.set(lawyerId, payload);
    void import('@/app/services/calendarDossierSync')
        .then((m) =>
            m.ensureCalendarPopulatedFromLiveDossiers({
                lawyerId,
                lawsuitFiles: payload.lawsuitFiles,
                executionFiles: payload.executionFiles,
                criminalCases: payload.criminalCases,
                globalNotes: payload.globalNotes,
                fieldTasks: payload.fieldTasks,
            }),
        )
        .then((ok) => {
            if (ok === false) {
                scheduleLivePopulateRetry(lawyerId, fingerprint);
                return;
            }
            resetLivePopulateRetryBudget(lawyerId);
            markDossierSyncFingerprint(lawyerId, fingerprint);
        })
        .catch((err) => {
            reportCalendarBridgeSyncFailure(err, {
                phase: 'incremental-live',
                userId: lawyerId,
            });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(CALENDAR_BACKGROUND_SYNC_FAILED_EVENT));
            }
            scheduleLivePopulateRetry(lawyerId, fingerprint);
        });
}

function scheduleIncrementalSync(lawyerId: string, payload: SyncPayload, fingerprint: string): void {
    lastPayloadByLawyer.set(lawyerId, payload);
    resetLivePopulateRetryBudget(lawyerId);
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
    enabled: boolean,
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
        if (!enabled) return;
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
        const onCalendarRequest = (e: Event) => {
            if (!mountedRef.current || !lawyerId) return;
            if (shouldSkipDossierSyncForFingerprint(lawyerId, dossierFingerprint)) return;
            const latest = lastPayloadByLawyer.get(lawyerId) ?? payload;
            const immediate =
                (e as CustomEvent<{ immediate?: boolean }>).detail?.immediate === true;
            if (immediate) {
                runIncrementalSync(lawyerId, latest, dossierFingerprint);
                return;
            }
            scheduleIncrementalSync(lawyerId, latest, dossierFingerprint);
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
    }, [enabled, lawyerId, dossierFingerprint, payload]);
}

/** يُستدعى بعد حفظ مهمة/معاملة Threading — يُسقط التخطّي حتى لا تتجمّد مهل المعاملات */
export function bumpThreadingCalendarSync(lawyerId: string | null | undefined): void {
    if (!lawyerId) return;
    const latest = lastPayloadByLawyer.get(lawyerId) ?? {
        lawsuitFiles: [],
        executionFiles: [],
        globalNotes: [],
        fieldTasks: [],
        criminalCases: [],
    };
    clearDossierSyncFingerprint(lawyerId);
    scheduleIncrementalSync(lawyerId, latest, fingerprintOf(latest));
}

/** للاختبارات — يصفّر المؤقتات والحمولات المخزّنة */
export function resetIncrementalCalendarSyncForTests(): void {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    lastPayloadByLawyer.clear();
    for (const t of livePopulateRetryTimers.values()) clearTimeout(t);
    livePopulateRetryTimers.clear();
    livePopulateRetryCount.clear();
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
