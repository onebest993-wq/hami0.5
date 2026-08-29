import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { SecretaryOrchestrator, type SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { filterAuthenticSecretaryAlerts } from '@/app/services/calendarAuthenticity';
import { enrichAlertClientPhone } from '@/app/services/enrichAlertContact';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { syncPushForNewCriticalAlerts } from '@/app/services/appAlertPushSync';
import { writeHomeHubSecretaryAlertsCache, peekHomeHubSecretaryAlertsCache } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import { buildAlertsDataSignature } from '@/app/services/alerts/alertsDataSignature';
import { filterAlertsByNotificationSettings } from '@/app/services/settings/settingsRuntime';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { isBenignSecureFetchError } from '@/app/services/secureFetchErrors';
import type { LegalTask } from '@/app/types/TaskEngine';
import { debug } from '@/app/utils/debug';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/utils/quantumTasksEvents';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';

function loadCalendarDossierSync() {
    return import('@/app/services/calendarDossierSync');
}

type RawNote = {
    id: string | number;
    title?: string;
    body?: string;
    isPinned?: boolean;
    date?: string;
    apptDate?: string;
    reminder_at?: string;
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CALENDAR_REPOPULATE_INTERVAL_MS = 25 * 60 * 1000;
const DEBOUNCE_MS = 350;
const DATA_CHANGE_DEBOUNCE_MS = 2_500;

export function useAppAlerts(params: {
    lawyerId?: string | null;
    files: FileData[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes: unknown[];
    fieldTasks?: LegalTask[];
    /** تأجيل توليد تنبيهات السكرتير حتى idle — لا يعيق أول إطار */
    deferUntilIdle?: boolean;
}) {
    const resolvedLawyerId = resolveCalendarUserId(params.lawyerId ?? null);
    const initialCached = peekHomeHubSecretaryAlertsCache(resolvedLawyerId);

    const [alerts, setAlerts] = useState<SecretaryAlert[]>(() => initialCached ?? []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filesRef = useRef(params.files);
    const executionRef = useRef(params.executionFiles);
    const notesRef = useRef(params.notes);
    const fieldTasksRef = useRef(params.fieldTasks ?? []);
    const criminalRef = useRef(params.criminalCases ?? []);
    const generationRef = useRef(0);
    const debounceRef = useRef<number | null>(null);
    const hasLoadedOnceRef = useRef(initialCached !== null);
    const dataSignatureRef = useRef('');

    filesRef.current = params.files;
    executionRef.current = params.executionFiles;
    notesRef.current = params.notes;
    fieldTasksRef.current = params.fieldTasks ?? [];
    criminalRef.current = params.criminalCases ?? [];

    const refresh = useCallback(async (options?: { syncCalendar?: boolean }) => {
        const syncCalendar = options?.syncCalendar === true;
        const uid = resolveCalendarUserId(params.lawyerId ?? null);
        const gen = ++generationRef.current;
        setError(null);
        try {
            if (syncCalendar) {
                try {
                    const { ensureCalendarPopulatedFromLiveDossiers } = await loadCalendarDossierSync();
                    await ensureCalendarPopulatedFromLiveDossiers(
                        {
                            lawyerId: uid,
                            lawsuitFiles: filesRef.current,
                            executionFiles: executionRef.current,
                            criminalCases: criminalRef.current,
                            globalNotes: notesRef.current,
                            fieldTasks: fieldTasksRef.current,
                        },
                        { emitUpdated: false },
                    );
                } catch (calendarErr) {
                    debug.warn('[useAppAlerts] calendar populate skipped (non-fatal):', calendarErr);
                }
            }

            const rawList = await SecretaryOrchestrator.getUnifiedAlerts({
                lawyerId: uid,
                files: filesRef.current,
                executionFiles: executionRef.current,
                criminalCases: criminalRef.current,
                notes: notesRef.current as RawNote[],
                fieldTasks: fieldTasksRef.current,
            });
            const enriched = rawList.map((a) =>
                enrichAlertClientPhone(a, {
                    lawsuitFiles: filesRef.current,
                    executionFiles: executionRef.current,
                    criminalCases: criminalRef.current,
                }),
            );
            const list = filterAuthenticSecretaryAlerts(enriched);
            if (gen !== generationRef.current) return;
            const settings = getLawyerSettingsSnapshot();
            const visible = filterAlertsByNotificationSettings(list, settings);
            setAlerts(visible);
            writeHomeHubSecretaryAlertsCache(uid, visible);
            void syncPushForNewCriticalAlerts(list, uid);
        } catch (err) {
            if (gen !== generationRef.current) return;
            const msg = err instanceof Error ? err.message : 'تعذّر تحديث التنبيهات';
            if (isBenignSecureFetchError(err)) {
                debug.warn('[useAppAlerts] refresh skipped (offline/unavailable):', err);
            } else {
                debug.error('[useAppAlerts] refresh failed:', err);
            }
            setError(msg);
        } finally {
            if (gen === generationRef.current) {
                setLoading(false);
                hasLoadedOnceRef.current = true;
            }
        }
    }, [params.lawyerId]);

    useEffect(() => {
        const uid = resolveCalendarUserId(params.lawyerId ?? null);
        const cached = peekHomeHubSecretaryAlertsCache(uid);
        hasLoadedOnceRef.current = cached !== null;
        setAlerts(cached ?? []);
        setError(null);
        dataSignatureRef.current = '';
    }, [params.lawyerId]);

    const scheduleRefresh = useCallback(
        (options?: { syncCalendar?: boolean; debounceMs?: number }) => {
            const debounceMs = options?.debounceMs ?? DEBOUNCE_MS;
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
                debounceRef.current = null;
                void refresh({ syncCalendar: options?.syncCalendar });
            }, debounceMs);
        },
        [refresh],
    );

    useEffect(() => {
        const runInitial = () => scheduleRefresh({ syncCalendar: true });
        let cancelDefer: (() => void) | undefined;
        if (params.deferUntilIdle) {
            if (typeof requestIdleCallback !== 'undefined') {
                const idleId = requestIdleCallback(runInitial, { timeout: 1_500 });
                cancelDefer = () => cancelIdleCallback(idleId);
            } else {
                const t = window.setTimeout(runInitial, 400);
                cancelDefer = () => window.clearTimeout(t);
            }
        } else {
            runInitial();
        }
        let interval: number | null = null;
        let calendarInterval: number | null = null;
        const startInterval = () => {
            if (interval != null) return;
            interval = window.setInterval(
                () => void refresh({ syncCalendar: false }),
                REFRESH_INTERVAL_MS,
            );
            calendarInterval = window.setInterval(
                () => void refresh({ syncCalendar: true }),
                CALENDAR_REPOPULATE_INTERVAL_MS,
            );
        };
        const stopInterval = () => {
            if (interval != null) {
                window.clearInterval(interval);
                interval = null;
            }
            if (calendarInterval != null) {
                window.clearInterval(calendarInterval);
                calendarInterval = null;
            }
        };
        const isVisible = () =>
            typeof document === 'undefined' || document.visibilityState !== 'hidden';
        if (isVisible()) startInterval();

        const onCalendar = () => scheduleRefresh({ syncCalendar: false });
        const onQuantumTasks = () => {
            fieldTasksRef.current = getQuantumPendingSnapshot();
            scheduleRefresh({ syncCalendar: false });
        };
        const onVisibilityChange = () => {
            if (isVisible()) {
                scheduleRefresh({ syncCalendar: false });
                startInterval();
            } else {
                stopInterval();
            }
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendar);
        window.addEventListener(QUANTUM_TASKS_CHANGED_EVENT, onQuantumTasks);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }
        return () => {
            cancelDefer?.();
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            stopInterval();
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendar);
            window.removeEventListener(QUANTUM_TASKS_CHANGED_EVENT, onQuantumTasks);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
            generationRef.current += 1;
        };
    }, [scheduleRefresh, refresh, params.deferUntilIdle, params.lawyerId]);

    useEffect(() => {
        const signature = buildAlertsDataSignature(params);
        if (signature === dataSignatureRef.current) return;
        dataSignatureRef.current = signature;
        scheduleRefresh({ syncCalendar: false, debounceMs: DATA_CHANGE_DEBOUNCE_MS });
    }, [
        params.files,
        params.executionFiles,
        params.criminalCases,
        params.notes,
        params.fieldTasks,
        scheduleRefresh,
    ]);

    return {
        alerts,
        loading,
        error,
        refresh: () => refresh({ syncCalendar: true }),
        refreshLight: () => refresh({ syncCalendar: false }),
    };
}
