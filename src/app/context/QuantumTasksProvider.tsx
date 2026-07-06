import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readLatestDossierBackup } from '@/app/services/dossierPersistence/dossierBackupStore';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    agendaTasksLifecycleRevision,
    mergeHydratedQuantumTasks,
} from '@/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    deserializeQuantumTasks,
    persistQuantumTasksBackground,
    persistQuantumTasksSync,
    QUANTUM_TASKS_STORAGE_KEY,
    readQuantumTasksFromDiskSync,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/hooks/useIncrementalCalendarSync';
import {
    QuantumTasksActionsContext,
    QuantumTasksContext,
    QuantumTasksDataContext,
} from '@/app/context/quantumTasksContext';
import { publishQuantumTasksMetrics } from '@/app/utils/quantumTasksMetrics';

export type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
export { QuantumTasksContext } from '@/app/context/quantumTasksContext';

const AGENDA_ROLLOVER_CHECK_MS = 60_000;
const ASYNC_PERSIST_DEBOUNCE_MS = 500;

/** Provider فقط — الـ hook في `useQuantumTasksContext.ts` لتوافق Fast Refresh */
export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const bootTasksRef = useRef<LegalTask[] | null>(null);
    if (bootTasksRef.current === null) {
        bootTasksRef.current = readQuantumTasksFromDiskSync();
    }

    const [storageHydrated, setStorageHydrated] = useState(true);
    const agendaDayRef = useRef(new Date().toDateString());
    const tasksRef = useRef<LegalTask[]>(bootTasksRef.current);
    const asyncPersistTimerRef = useRef<number | null>(null);
    const pendingAsyncPersistRef = useRef<LegalTask[] | null>(null);
    const hiddenFlushTimerRef = useRef<number | null>(null);

    const notifyTasksChanged = useCallback(() => {
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
            }
        } catch {
            /* ignore */
        }
    }, []);

    const flushAsyncPersist = useCallback(() => {
        if (asyncPersistTimerRef.current !== null) {
            window.clearTimeout(asyncPersistTimerRef.current);
            asyncPersistTimerRef.current = null;
        }
        const pending = pendingAsyncPersistRef.current;
        if (!pending) return;
        pendingAsyncPersistRef.current = null;
        void persistQuantumTasksBackground(pending).then(() => {
            notifyTasksChanged();
        });
    }, [notifyTasksChanged]);

    const scheduleAsyncPersist = useCallback(
        (nextTasks: LegalTask[]) => {
            pendingAsyncPersistRef.current = nextTasks;
            if (asyncPersistTimerRef.current !== null) {
                window.clearTimeout(asyncPersistTimerRef.current);
            }
            asyncPersistTimerRef.current = window.setTimeout(() => {
                asyncPersistTimerRef.current = null;
                flushAsyncPersist();
            }, ASYNC_PERSIST_DEBOUNCE_MS);
        },
        [flushAsyncPersist],
    );

    const commitTasksToStorage = useCallback(
        (nextTasks: LegalTask[]) => {
            tasksRef.current = nextTasks;
            persistQuantumTasksSync(nextTasks);
            scheduleAsyncPersist(nextTasks);
        },
        [scheduleAsyncPersist],
    );

    const value = useQuantumTasks(bootTasksRef.current, { onTasksCommitted: commitTasksToStorage });
    tasksRef.current = value.tasks;

    const flushPersist = useCallback(async () => {
        persistQuantumTasksSync(tasksRef.current);
        flushAsyncPersist();
    }, [flushAsyncPersist]);

    const dataValue = useMemo(
        () => ({
            tasks: value.tasks,
            pendingTasks: value.pendingTasks,
            storageHydrated,
        }),
        [value.tasks, value.pendingTasks, storageHydrated],
    );

    const actionsValue = useMemo(
        () => ({
            addTask: value.addTask,
            addTaskFromVoice: value.addTaskFromVoice,
            addWeeklyLocationBundle: value.addWeeklyLocationBundle,
            addSnoozedBacklogTask: value.addSnoozedBacklogTask,
            updateTask: value.updateTask,
            deleteTask: value.deleteTask,
            completeTask: value.completeTask,
            reopenTask: value.reopenTask,
            toggleTaskFatalDeadline: value.toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain: value.toggleTaskPinnedToFieldCurtain,
            setTaskLocation: value.setTaskLocation,
            addSubTask: value.addSubTask,
            toggleSubTaskComplete: value.toggleSubTaskComplete,
            setSubTaskLocation: value.setSubTaskLocation,
            addDocumentRequirement: value.addDocumentRequirement,
            toggleDocumentRequirement: value.toggleDocumentRequirement,
            addExpense: value.addExpense,
            setTasks: value.setTasks,
            flushPersist,
        }),
        [
            value.addTask,
            value.addTaskFromVoice,
            value.addWeeklyLocationBundle,
            value.addSnoozedBacklogTask,
            value.updateTask,
            value.deleteTask,
            value.completeTask,
            value.reopenTask,
            value.toggleTaskFatalDeadline,
            value.toggleTaskPinnedToFieldCurtain,
            value.setTaskLocation,
            value.addSubTask,
            value.toggleSubTaskComplete,
            value.setSubTaskLocation,
            value.addDocumentRequirement,
            value.toggleDocumentRequirement,
            value.addExpense,
            value.setTasks,
            flushPersist,
        ],
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            await SecureStoreService.ensurePersistedReady();
            let blob = await persistenceRepository.loadAsync<unknown>(QUANTUM_TASKS_STORAGE_KEY);
            if (!blob) {
                const backup = await readLatestDossierBackup('tasks');
                if (backup?.payload.length) {
                    blob = { tasks: backup.payload };
                }
            }
            if (cancelled) return;

            const loaded = prepareAgendaTasks(deserializeQuantumTasks(blob), new Date(), {
                skipRetentionPurge: true,
            });

            value.setTasks((prev) => {
                const merged = mergeHydratedQuantumTasks(prev, loaded);
                tasksRef.current = merged;
                return merged;
            });
            setStorageHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [value.setTasks]);

    useEffect(() => {
        if (!storageHydrated) return;

        const applyAgendaRollover = () => {
            const now = new Date();
            const dayKey = now.toDateString();
            if (dayKey === agendaDayRef.current) return;
            agendaDayRef.current = dayKey;
            value.setTasks((prev) => {
                const next = prepareAgendaTasks(prev, now);
                return agendaTasksLifecycleRevision(prev) === agendaTasksLifecycleRevision(next)
                    ? prev
                    : next;
            });
        };

        applyAgendaRollover();
        const id = window.setInterval(applyAgendaRollover, AGENDA_ROLLOVER_CHECK_MS);
        return () => window.clearInterval(id);
    }, [storageHydrated, value.setTasks]);

    useEffect(() => {
        publishQuantumTasksMetrics(value.tasks, value.pendingTasks);
    }, [value.tasks, value.pendingTasks]);

    useEffect(() => {
        const onPageHide = () => {
            if (hiddenFlushTimerRef.current !== null) {
                window.clearTimeout(hiddenFlushTimerRef.current);
                hiddenFlushTimerRef.current = null;
            }
            persistQuantumTasksSync(tasksRef.current);
            flushAsyncPersist();
        };
        const onHide = () => {
            if (document.visibilityState !== 'hidden') {
                if (hiddenFlushTimerRef.current !== null) {
                    window.clearTimeout(hiddenFlushTimerRef.current);
                    hiddenFlushTimerRef.current = null;
                }
                return;
            }
            if (hiddenFlushTimerRef.current !== null) {
                window.clearTimeout(hiddenFlushTimerRef.current);
            }
            hiddenFlushTimerRef.current = window.setTimeout(() => {
                hiddenFlushTimerRef.current = null;
                if (document.visibilityState === 'hidden') onPageHide();
            }, 900);
        };
        window.addEventListener('pagehide', onPageHide);
        document.addEventListener('visibilitychange', onHide);
        return () => {
            window.removeEventListener('pagehide', onPageHide);
            document.removeEventListener('visibilitychange', onHide);
            if (hiddenFlushTimerRef.current !== null) {
                window.clearTimeout(hiddenFlushTimerRef.current);
                hiddenFlushTimerRef.current = null;
            }
            if (asyncPersistTimerRef.current !== null) {
                window.clearTimeout(asyncPersistTimerRef.current);
            }
        };
    }, [flushAsyncPersist]);

    return (
        <QuantumTasksActionsContext.Provider value={actionsValue}>
            <QuantumTasksDataContext.Provider value={dataValue}>
                <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>
            </QuantumTasksDataContext.Provider>
        </QuantumTasksActionsContext.Provider>
    );
}
