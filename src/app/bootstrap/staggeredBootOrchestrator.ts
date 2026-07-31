import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootEvents';

export type StaggeredBootPriority = 'critical' | 'secondary' | 'deferred';

export { STAGGERED_BOOT_IDLE_EVENT } from '@/app/bootstrap/staggeredBootEvents';
const DASHBOARD_INTERACTIVE_EVENT = 'hami:dashboard-interactive';

type QueuedTask = {
    id: string;
    priority: StaggeredBootPriority;
    run: () => void | Promise<void>;
};

let listenerArmed = false;
let dashboardInteractiveReached = false;
let idleDispatched = false;
let queue: QueuedTask[] = [];
let draining = false;
let cancelDrain: (() => void) | null = null;

function priorityRank(p: StaggeredBootPriority): number {
    if (p === 'critical') return 0;
    if (p === 'secondary') return 1;
    return 2;
}

function phaseDelayMs(priority: StaggeredBootPriority): number {
    const native = isCapacitorNativePlatform();
    const lite = isLitePerformanceActive();

    if (priority === 'critical') return 0;

    if (priority === 'secondary') {
        if (native) return lite ? 5_500 : 3_500;
        return lite ? 2_000 : 900;
    }

    if (native) return lite ? 10_000 : 7_000;
    return lite ? 4_500 : 2_800;
}

function interTaskGapMs(): number {
    const native = isCapacitorNativePlatform();
    const lite = isLitePerformanceActive();
    if (native) return lite ? 1_200 : 800;
    return lite ? 600 : 320;
}

function idleTimeoutMs(): number {
    const native = isCapacitorNativePlatform();
    const lite = isLitePerformanceActive();
    if (native) return lite ? 14_000 : 9_000;
    return lite ? 7_000 : 4_000;
}

function dispatchBootIdleOnce(): void {
    if (idleDispatched || typeof window === 'undefined') return;
    idleDispatched = true;
    window.dispatchEvent(new Event(STAGGERED_BOOT_IDLE_EVENT));
}

function runWhenIdle(fn: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    let cancelled = false;
    let idleId: number | undefined;
    let timerId: number | undefined;

    const run = () => {
        if (cancelled) return;
        if (typeof requestIdleCallback !== 'undefined') {
            idleId = requestIdleCallback(
                () => {
                    if (!cancelled) fn();
                },
                { timeout: idleTimeoutMs() },
            );
        } else {
            timerId = window.setTimeout(() => {
                if (!cancelled) fn();
            }, Math.min(idleTimeoutMs(), 1_500));
        }
    };

    run();

    return () => {
        cancelled = true;
        if (timerId !== undefined) window.clearTimeout(timerId);
        if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
            cancelIdleCallback(idleId);
        }
    };
}

async function drainQueue(): Promise<void> {
    if (draining) return;
    draining = true;

    const sorted = [...queue].sort(
        (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
    );
    queue = [];

    for (let i = 0; i < sorted.length; i += 1) {
        const task = sorted[i];
        const delay = phaseDelayMs(task.priority);
        if (delay > 0) {
            await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
        }

        await new Promise<void>((resolve) => {
            const cancel = runWhenIdle(() => {
                cancel();
                void Promise.resolve(task.run()).finally(resolve);
            });
            if (!draining) cancel();
        });

        if (i < sorted.length - 1) {
            const gap = interTaskGapMs();
            if (gap > 0) {
                await new Promise<void>((resolve) => window.setTimeout(resolve, gap));
            }
        }
    }

    draining = false;
    dispatchBootIdleOnce();

    if (queue.length > 0) {
        void drainQueue();
    }
}

function scheduleDrain(): void {
    if (!dashboardInteractiveReached || queue.length === 0 || draining) return;
    cancelDrain?.();
    cancelDrain = runWhenIdle(() => {
        cancelDrain = null;
        void drainQueue();
    });
}

function armInteractiveListener(): void {
    if (listenerArmed || typeof window === 'undefined') return;
    listenerArmed = true;

    const onInteractive = () => {
        dashboardInteractiveReached = true;
        scheduleDrain();
    };

    window.addEventListener(DASHBOARD_INTERACTIVE_EVENT, onInteractive, { once: true });

    if (
        typeof document !== 'undefined' &&
        document.querySelector('[data-testid="lawyer-dashboard-ready"]')
    ) {
        onInteractive();
    }
}

/**
 * يُؤجّل مهام التهيئة غير الحرجة حتى `hami:dashboard-interactive` ثم idle متتابع.
 * critical = فوري (لا يُستخدم إلا للحالات الاستثنائية).
 */
export function enqueueStaggeredBootTask(
    id: string,
    run: () => void | Promise<void>,
    priority: StaggeredBootPriority = 'secondary',
): () => void {
    if (typeof window === 'undefined') return () => {};

    if (priority === 'critical') {
        void Promise.resolve(run());
        return () => {};
    }

    armInteractiveListener();

    const existingIdx = queue.findIndex((t) => t.id === id);
    if (existingIdx >= 0) {
        queue[existingIdx] = { id, priority, run };
    } else {
        queue.push({ id, priority, run });
    }

    scheduleDrain();

    return () => {
        queue = queue.filter((t) => t.id !== id);
    };
}

/** للاختبارات — إعادة ضبط الحالة */
export function resetStaggeredBootOrchestratorForTests(): void {
    listenerArmed = false;
    dashboardInteractiveReached = false;
    idleDispatched = false;
    queue = [];
    draining = false;
    cancelDrain?.();
    cancelDrain = null;
}
