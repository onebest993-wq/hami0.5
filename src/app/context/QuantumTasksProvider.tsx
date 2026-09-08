import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    agendaTasksLifecycleRevision,
    mergeHydratedQuantumTasks,
} from '@/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration';
import {
    useComposedQuantumTasks,
    useQuantumTasksCore,
} from '@/app/hooks/useQuantumTasksCore';
import { useQuantumTasksCreateLazy } from '@/app/hooks/useQuantumTasksCreateLazy';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    deserializeQuantumTasks,
    persistQuantumTasksBackground,
    persistQuantumTasksSync,
    QUANTUM_TASKS_STORAGE_KEY,
    readQuantumTasksFromDiskSync,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT, QUANTUM_TASKS_UPSERT_EVENT } from '@/app/utils/quantumTasksEvents';
import { clearLegacyPlaintextMirror } from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    QuantumTasksActionsContext,
    QuantumTasksContext,
    QuantumTasksDataContext,
} from '@/app/context/quantumTasksContext';
import { publishQuantumTasksMetrics } from '@/app/utils/quantumTasksMetrics';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { useQuantumTasksBackgroundFlush } from '@/app/hooks/useQuantumTasksBackgroundFlush';
import { tearDownTasksFloatingState } from '@/app/components/lawyer/dashboard/tasksManager/tearDownTasksFloatingState';

const AGENDA_ROLLOVER_CHECK_MS = 60_000;
const ASYNC_PERSIST_DEBOUNCE_MS = 500;

let quantumTasksProviderSessionCounter = 0;
let lastActiveQuantumTasksProviderFlowId: number | null = null;

function loadPrepareAgendaTasks() {
    return import('@/app/components/lawyer/dashboard/tasksManager/utils').then(
        (m) => m.prepareAgendaTasks,
    );
}

/** Provider فقط — الـ hook في `useQuantumTasksContext.ts` لتوافق Fast Refresh */
export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    /** قراءة leftover فوراً — بلا SecureStore على المسار البارد */
    const bootTasksRef = useRef<LegalTask[]>(readQuantumTasksFromDiskSync());
    /** المهام متاحة من القراءة المتزامنة — لا انتظار SecureStore لعرض الستارة */
    const [storageHydrated, setStorageHydrated] = useState(true);
    const agendaDayRef = useRef(new Date().toDateString());
    const tasksRef = useRef<LegalTask[]>([]);
    const asyncPersistTimerRef = useRef<number | null>(null);
    const pendingAsyncPersistRef = useRef<LegalTask[] | null>(null);
    const sessionIdRef = useRef<number>(++quantumTasksProviderSessionCounter);
    const activeSessionIdRef = useRef<number>(sessionIdRef.current);
    lastActiveQuantumTasksProviderFlowId = sessionIdRef.current;
    const isActiveFlow = () =>
        sessionIdRef.current === activeSessionIdRef.current &&
        lastActiveQuantumTasksProviderFlowId === sessionIdRef.current;

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

    const core = useQuantumTasksCore(bootTasksRef.current, { onTasksCommitted: commitTasksToStorage });
    const create = useQuantumTasksCreateLazy(core.setTasks);
    const value = useComposedQuantumTasks(core, create);
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
            postponeTask: value.postponeTask,
            toggleTaskFatalDeadline: value.toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain: value.toggleTaskPinnedToFieldCurtain,
            setTaskLocation: value.setTaskLocation,
            addSubTask: value.addSubTask,
            toggleSubTaskComplete: value.toggleSubTaskComplete,
            setSubTaskPlanStatus: value.setSubTaskPlanStatus,
            renameSubTask: value.renameSubTask,
            removeSubTask: value.removeSubTask,
            setSubTaskLocation: value.setSubTaskLocation,
            addDocumentRequirement: value.addDocumentRequirement,
            toggleDocumentRequirement: value.toggleDocumentRequirement,
            requestTaskHelp: value.requestTaskHelp,
            acceptTaskHelp: value.acceptTaskHelp,
            addSharedTaskNote: value.addSharedTaskNote,
            markHelpCompleted: value.markHelpCompleted,
            confirmHelpReview: value.confirmHelpReview,
            delegatedTasks: value.delegatedTasks,
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
            value.postponeTask,
            value.toggleTaskFatalDeadline,
            value.toggleTaskPinnedToFieldCurtain,
            value.setTaskLocation,
            value.addSubTask,
            value.toggleSubTaskComplete,
            value.setSubTaskPlanStatus,
            value.renameSubTask,
            value.removeSubTask,
            value.setSubTaskLocation,
            value.addDocumentRequirement,
            value.toggleDocumentRequirement,
            value.requestTaskHelp,
            value.acceptTaskHelp,
            value.addSharedTaskNote,
            value.markHelpCompleted,
            value.confirmHelpReview,
            value.delegatedTasks,
            value.setTasks,
            flushPersist,
        ],
    );

    useEffect(() => {
        let cancelled = false;
        /** AbortController #3: cancel SecureStore hydration + async awaits when provider unmounts early */
        const hydrationAbort = new AbortController();
        const startHydrate = () => {
            if (!isActiveFlow() || hydrationAbort.signal.aborted) return;
            void (async () => {
                if (hydrationAbort.signal.aborted) return;
                const { default: SecureStoreService } = await import('@/app/services/SecureStoreService');
                if (!isActiveFlow() || hydrationAbort.signal.aborted) return;
                await SecureStoreService.ensurePersistedReady();
                if (!isActiveFlow() || hydrationAbort.signal.aborted) return;
                let blob = await persistenceRepository.loadAsync<unknown>(QUANTUM_TASKS_STORAGE_KEY);
                if (hydrationAbort.signal.aborted) return;
                if (!blob) {
                    const { readLatestDossierBackup } = await import(
                        '@/app/services/dossierPersistence/dossierBackupStore'
                    );
                    const backup = await readLatestDossierBackup('tasks');
                    if (backup?.payload.length) {
                        blob = { tasks: backup.payload };
                    }
                }
                if (cancelled || hydrationAbort.signal.aborted) return;
                if (!isActiveFlow()) return;

                const loaded = deserializeQuantumTasks(blob);

                let leftoverRaw: string | null = null;
                try {
                    leftoverRaw =
                        typeof localStorage !== 'undefined'
                            ? localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)
                            : null;
                } catch {
                    leftoverRaw = null;
                }

                /**
                 * أصل القرص يربح: امسح المرآة قبل merge حتى لا يكتب persist
                 * leftover فوق SecureStore أثناء drain داخل persistQuantumTasksSync.
                 */
                if (blob && leftoverRaw?.trim()) {
                    clearLegacyPlaintextMirror(QUANTUM_TASKS_STORAGE_KEY);
                    leftoverRaw = null;
                }

                let leftoverSeed: LegalTask[] = [];
                if (leftoverRaw?.trim()) {
                    try {
                        leftoverSeed = deserializeQuantumTasks(JSON.parse(leftoverRaw) as unknown);
                    } catch {
                        leftoverSeed = [];
                    }
                }

                if (!isActiveFlow() || hydrationAbort.signal.aborted) return;
                value.setTasks((prev) => {
                    if (!isActiveFlow() || hydrationAbort.signal.aborted) return prev;
                    const base =
                        prev.length > 0 ? prev : leftoverSeed.length > 0 ? leftoverSeed : prev;
                    const merged = mergeHydratedQuantumTasks(base, loaded);
                    tasksRef.current = merged;
                    return merged;
                });
                setStorageHydrated(true);

                void Promise.race([
                    loadPrepareAgendaTasks(),
                    new Promise<never>((_, reject) => {
                        hydrationAbort.signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true });
                    }),
                ])
                    .then((prepareAgendaTasks) => {
                        if (cancelled || hydrationAbort.signal.aborted) return;
                        if (!isActiveFlow()) return;
                        const now = new Date();
                        value.setTasks((prev) => {
                            if (!isActiveFlow()) return prev;
                            const next = prepareAgendaTasks(prev, now, { skipRetentionPurge: true });
                            return agendaTasksLifecycleRevision(prev) ===
                                agendaTasksLifecycleRevision(next)
                                ? prev
                                : next;
                        });
                    })
                    .catch((err) => {
                        if (err?.message === 'ABORTED') return;
                        /* ignore prepare agenda errors */
                    });

                try {
                    if (!leftoverRaw?.trim()) return;
                    const toPersist =
                        tasksRef.current.length > 0 ? tasksRef.current : leftoverSeed;
                    if (toPersist.length > 0) {
                        persistQuantumTasksSync(toPersist);
                    } else {
                        clearLegacyPlaintextMirror(QUANTUM_TASKS_STORAGE_KEY);
                    }
                } catch {
                    /* leftover drain must not block the agenda */
                }
            })();
        };
        /** بعد content-ready — لا تنافس I/O القرص مع HomeTab قبل كشف الشعار */
        const unbind = onBootContentReady(startHydrate);
        return () => {
            hydrationAbort.abort();
            cancelled = true;
            unbind();
            tearDownTasksFloatingState();
            if (activeSessionIdRef.current === sessionIdRef.current) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [value.setTasks]);

    useEffect(() => {
        const onUpsert = (event: Event) => {
            if (!isActiveFlow()) return;
            const task = (event as CustomEvent<{ task?: LegalTask }>).detail?.task;
            if (!task?.id) return;
            value.setTasks((prev) => {
                if (!isActiveFlow()) return prev;
                if (prev.some((t) => t.id === task.id)) return prev;
                const next = [...prev, task];
                tasksRef.current = next;
                return next;
            });
        };
        window.addEventListener(QUANTUM_TASKS_UPSERT_EVENT, onUpsert as EventListener);
        return () => window.removeEventListener(QUANTUM_TASKS_UPSERT_EVENT, onUpsert as EventListener);
    }, [value.setTasks]);

    const applyAgendaRollover = useCallback(() => {
        if (!isActiveFlow()) return;
        const now = new Date();
        const dayKey = now.toDateString();
        if (dayKey === agendaDayRef.current) return;
        agendaDayRef.current = dayKey;
        void loadPrepareAgendaTasks()
            .then((prepareAgendaTasks) => {
                if (!isActiveFlow()) return;
                value.setTasks((prev) => {
                    if (!isActiveFlow()) return prev;
                    const next = prepareAgendaTasks(prev, now);
                    return agendaTasksLifecycleRevision(prev) === agendaTasksLifecycleRevision(next)
                        ? prev
                        : next;
                });
            })
            .catch(() => undefined);
    }, [value.setTasks]);

    /** visibility + pagehide + HAMI_APP_STATE_EVENT (Capacitor) — بلا استيراد App في المسار الساخن */
    useVisibilityAwareInterval(applyAgendaRollover, AGENDA_ROLLOVER_CHECK_MS, storageHydrated);

    const flushToDisk = useCallback(() => {
        persistQuantumTasksSync(tasksRef.current);
        flushAsyncPersist();
    }, [flushAsyncPersist]);

    useQuantumTasksBackgroundFlush(flushToDisk);

    useEffect(() => {
        publishQuantumTasksMetrics(value.tasks, value.pendingTasks);
    }, [value.tasks, value.pendingTasks]);

    useEffect(() => {
        return () => {
            if (asyncPersistTimerRef.current !== null) {
                window.clearTimeout(asyncPersistTimerRef.current);
            }
        };
    }, []);

    return (
        <QuantumTasksActionsContext.Provider value={actionsValue}>
            <QuantumTasksDataContext.Provider value={dataValue}>
                <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>
            </QuantumTasksDataContext.Provider>
        </QuantumTasksActionsContext.Provider>
    );
}

/** يُركَّب عند فتح ستارة/مدير المهام — لا يلفّ FullBoot حتى لا يُعاد تركيب المنزل. */
export function EnsureQuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const ctx = useContext(QuantumTasksContext);
    if (ctx) return <>{children}</>;
    return <QuantumTasksProvider>{children}</QuantumTasksProvider>;
}
