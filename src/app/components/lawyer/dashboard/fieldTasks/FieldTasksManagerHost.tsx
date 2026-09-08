import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { TasksManagerOverlay } from '@/app/components/lawyer/dashboard/TasksManagerOverlay';
import {
    getCachedTasksManagerOverlay,
    loadTasksManagerModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { TasksManagerOpenInstantChrome } from '@/app/components/lawyer/dashboard/tasksManager/TasksManagerOpenInstantChrome';
import { removeTasksManagerInstantChrome } from '@/app/runtime/tasksManagerInstantPaint';
import { tearDownTasksFloatingState } from '@/app/components/lawyer/dashboard/tasksManager/tearDownTasksFloatingState';

let fieldTasksManagerHostSessionCounter = 0;
let lastActiveFieldTasksManagerHostFlowId: number | null = null;

type TasksManagerOverlayProps = React.ComponentProps<typeof TasksManagerOverlay>;
type OverlayComponent = React.ComponentType<TasksManagerOverlayProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function TasksManagerLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            data-testid="tasks-manager-load-error"
            className="fixed inset-0 z-[240] flex flex-col items-center justify-center gap-3 px-6 text-center bg-[#0A0F1C]"
            role="alert"
        >
            <p className="text-sm font-semibold text-[#F4F4F5]/85">تعذّر تحميل أجندة المهام</p>
            <button
                type="button"
                data-testid="tasks-manager-retry"
                onClick={onRetry}
                className="rounded-lg border border-[#E6C673]/35 bg-[#12182B]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/** يحمّل أجندة المهام — chunk دافئ مخفياً؛ الفتح = إظهار فوري من الكاش أو قشرة فورية */
export function FieldTasksManagerHost(props: TasksManagerOverlayProps): React.ReactElement | null {
    const sessionIdRef = useRef<number>(++fieldTasksManagerHostSessionCounter);
    const activeSessionIdRef = useRef<number>(sessionIdRef.current);
    lastActiveFieldTasksManagerHostFlowId = sessionIdRef.current;
    const isActiveFlow = () =>
        sessionIdRef.current === activeSessionIdRef.current &&
        lastActiveFieldTasksManagerHostFlowId === sessionIdRef.current;

    const { open, onClose, keepAlive = false } = props;
    const [Component, setComponent] = useState<OverlayComponent | null>(() => getCachedTasksManagerOverlay());
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        if (!isActiveFlow()) return;
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        if (!isActiveFlow()) return;
        let cancelled = false;
        let retryTimer: number | null = null;
        /** AbortController #1: cancel module retry loads + warm-create when host unmounts early */
        const loaderAbort = new AbortController();
        const cached = getCachedTasksManagerOverlay();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        } else {
            let attempts = 0;
            const tryLoad = () => {
                if (!isActiveFlow() || loaderAbort.signal.aborted) return;
                const hit = getCachedTasksManagerOverlay();
                if (hit) {
                    setComponent(() => hit);
                    setLoadFailed(false);
                    return;
                }

                void Promise.race([
                    loadTasksManagerModule(),
                    new Promise<never>((_, reject) => {
                        loaderAbort.signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true });
                    }),
                ])
                    .then((mod) => {
                        if (!isActiveFlow()) return;
                        if (cancelled || loaderAbort.signal.aborted) return;
                        if (mod?.TasksManagerOverlay) {
                            setComponent(() => mod.TasksManagerOverlay);
                            setLoadFailed(false);
                            return;
                        }
                        throw new Error('[fieldTasks:host] TasksManagerOverlay missing');
                    })
                    .catch((err) => {
                        if (err?.message === 'ABORTED') return;
                        if (!isActiveFlow()) return;
                        if (cancelled) return;
                        attempts += 1;
                        if (attempts < MAX_LOAD_ATTEMPTS) {
                            retryTimer = window.setTimeout(tryLoad, LOAD_RETRY_MS);
                            return;
                        }
                        setLoadFailed(true);
                    });
            };
            tryLoad();
        }

        const warmCreate = () => {
            if (!isActiveFlow() || loaderAbort.signal.aborted) return;
            void Promise.race([
                import('@/app/services/tasks/quantumTaskCreateLoad'),
                new Promise<never>((_, reject) => {
                    loaderAbort.signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true });
                }),
            ])
                .then((m) => {
                    if (!isActiveFlow() || loaderAbort.signal.aborted) return;
                    m.loadQuantumTaskCreateBundle();
                })
                .catch((err) => {
                    if (err?.message === 'ABORTED') return;
                    /* ignore other import errors */
                });
        };
        let idleId: number | null = null;
        let timeoutId: number | null = null;
        if (typeof requestIdleCallback === 'function') {
            idleId = requestIdleCallback(warmCreate, { timeout: 2500 });
        } else {
            timeoutId = window.setTimeout(warmCreate, 800);
        }
        return () => {
            loaderAbort.abort();
            cancelled = true;
            if (retryTimer != null) window.clearTimeout(retryTimer);
            if (idleId != null && typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(idleId);
            }
            if (timeoutId != null) window.clearTimeout(timeoutId);
            tearDownTasksFloatingState();
            if (activeSessionIdRef.current === sessionIdRef.current) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [loadGeneration]);

    useLayoutEffect(() => {
        if (!isActiveFlow()) return;
        if (!loadFailed) return;
        removeTasksManagerInstantChrome();
    }, [loadFailed]);

    const ResolvedComponent = Component ?? getCachedTasksManagerOverlay();

    if (!open && !keepAlive) {
        return null;
    }

    if (ResolvedComponent) {
        return <ResolvedComponent {...props} onClose={onClose} keepAlive={keepAlive} />;
    }

    if (!open) {
        return null;
    }

    if (loadFailed) {
        return <TasksManagerLoadError onRetry={retryLoad} />;
    }

    return <TasksManagerOpenInstantChrome />;
}
