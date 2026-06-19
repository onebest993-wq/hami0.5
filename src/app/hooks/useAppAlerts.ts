import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { SecretaryOrchestrator, type SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { filterAuthenticSecretaryAlerts } from '@/app/services/calendarAuthenticity';
import { enrichAlertClientPhone } from '@/app/services/enrichAlertContact';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { syncPushForNewCriticalAlerts } from '@/app/services/appAlertPushSync';
import { filterAlertsByNotificationSettings, getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { ensureCalendarPopulatedFromLiveDossiers } from '@/app/services/calendarDossierSync';
import type { LegalTask } from '@/app/types/TaskEngine';
import { debug } from '@/app/utils/debug';

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
const DEBOUNCE_MS = 350;

export function useAppAlerts(params: {
    lawyerId?: string | null;
    files: FileData[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes: RawNote[];
    fieldTasks?: LegalTask[];
    /** تأجيل توليد تنبيهات السكرتير حتى idle — لا يعيق أول إطار */
    deferUntilIdle?: boolean;
}) {
    const [alerts, setAlerts] = useState<SecretaryAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filesRef = useRef(params.files);
    const executionRef = useRef(params.executionFiles);
    const notesRef = useRef(params.notes);
    const fieldTasksRef = useRef(params.fieldTasks ?? []);
    const criminalRef = useRef(params.criminalCases ?? []);
    const generationRef = useRef(0);
    const debounceRef = useRef<number | null>(null);
    const hasLoadedOnceRef = useRef(false);

    filesRef.current = params.files;
    executionRef.current = params.executionFiles;
    notesRef.current = params.notes;
    fieldTasksRef.current = params.fieldTasks ?? [];
    criminalRef.current = params.criminalCases ?? [];

    const refresh = useCallback(async () => {
        const uid = resolveCalendarUserId(params.lawyerId ?? null);
        const gen = ++generationRef.current;
        if (!hasLoadedOnceRef.current) setLoading(true);
        setError(null);
        try {
            await ensureCalendarPopulatedFromLiveDossiers({
                lawyerId: uid,
                lawsuitFiles: filesRef.current,
                executionFiles: executionRef.current,
                criminalCases: criminalRef.current,
                globalNotes: notesRef.current,
                fieldTasks: fieldTasksRef.current,
            }, { emitUpdated: false });

            const rawList = await SecretaryOrchestrator.getUnifiedAlerts({
                lawyerId: uid,
                files: filesRef.current,
                executionFiles: executionRef.current,
                criminalCases: criminalRef.current,
                notes: notesRef.current,
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
            void syncPushForNewCriticalAlerts(list, uid);
        } catch (err) {
            if (gen !== generationRef.current) return;
            const msg = err instanceof Error ? err.message : 'تعذّر تحديث التنبيهات';
            debug.error('[useAppAlerts] refresh failed:', err);
            setError(msg);
        } finally {
            if (gen === generationRef.current) {
                setLoading(false);
                hasLoadedOnceRef.current = true;
            }
        }
    }, [params.lawyerId]);

    useEffect(() => {
        hasLoadedOnceRef.current = false;
        setAlerts([]);
        setError(null);
    }, [params.lawyerId]);

    const scheduleRefresh = useCallback(() => {
        if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null;
            void refresh();
        }, DEBOUNCE_MS);
    }, [refresh]);

    useEffect(() => {
        const runInitial = () => scheduleRefresh();
        let cancelDefer: (() => void) | undefined;
        if (params.deferUntilIdle) {
            if (typeof requestIdleCallback !== 'undefined') {
                const idleId = requestIdleCallback(runInitial, { timeout: 4_000 });
                cancelDefer = () => cancelIdleCallback(idleId);
            } else {
                const t = window.setTimeout(runInitial, 800);
                cancelDefer = () => window.clearTimeout(t);
            }
        } else {
            runInitial();
        }
        let interval: number | null = null;
        const startInterval = () => {
            if (interval != null) return;
            interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
        };
        const stopInterval = () => {
            if (interval != null) {
                window.clearInterval(interval);
                interval = null;
            }
        };
        const isVisible = () =>
            typeof document === 'undefined' || document.visibilityState !== 'hidden';
        if (isVisible()) startInterval();

        const onCalendar = () => scheduleRefresh();
        const onVisibilityChange = () => {
            if (isVisible()) {
                scheduleRefresh();
                startInterval();
            } else {
                stopInterval();
            }
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendar);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibilityChange);
        }
        return () => {
            cancelDefer?.();
            if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
            stopInterval();
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendar);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibilityChange);
            }
            generationRef.current += 1;
        };
    }, [
        scheduleRefresh,
        refresh,
        params.deferUntilIdle,
        params.files,
        params.executionFiles,
        params.criminalCases,
        params.notes,
        params.fieldTasks,
    ]);

    return { alerts, loading, error, refresh };
}
