import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import {
    prefetchDockWidgetIntent,
    type DockWidgetPrefetchPhase,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';
import { dispatchFieldTasksPrimeHost } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksPrimeHost';
import { dispatchSchedulePrimeHost } from '@/app/runtime/scheduleBootHydrator';

const DOCK_PREFETCH_COOLDOWN_MS = 300;
const DOCK_IDLE_STAGGER_MS = 120;
const HEAVY_DOCK_IDLE_DELAY_MS = 4_500;
const HEAVY_DOCK_IDLE_STAGGER_MS = 220;
/** المنتدى خارج القائمة — يُسخَّن idle حتى يختفي انتظار أول فتح بارد */
const HEAVY_IDLE_PREFETCH_WIDGETS = new Set<HomeWidgetId>([
    'dockRepository',
    'dockNotepad',
    'dockVault',
    'hubExecution',
    'hubLawsuit',
    'hubTransaction',
]);
const lastPrefetchAt = new Map<HomeWidgetId, number>();
const idleScheduledKeys = new Set<string>();
const heavyIdleScheduledKeys = new Set<string>();
let idleCallbackId: number | null = null;
let idleFallbackTimerId: number | null = null;
const staggerTimerIds: number[] = [];

function clearStaggerTimers(): void {
    while (staggerTimerIds.length > 0) {
        window.clearTimeout(staggerTimerIds.pop()!);
    }
}

function cancelIdlePrefetchSchedule(): void {
    if (idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleCallbackId);
    }
    idleCallbackId = null;
    if (idleFallbackTimerId !== null) {
        window.clearTimeout(idleFallbackTimerId);
        idleFallbackTimerId = null;
    }
    clearStaggerTimers();
}

export function resetDockShellPrefetchGateForTests(): void {
    cancelIdlePrefetchSchedule();
    lastPrefetchAt.clear();
    idleScheduledKeys.clear();
    heavyIdleScheduledKeys.clear();
}

function runPrefetch(widgetId: HomeWidgetId, phase: DockWidgetPrefetchPhase): void {
    prefetchDockWidgetIntent(widgetId, phase);
}

/** prefetch واحد لكل widget كل ~300ms — يمنع triple-fire من enter/down/focus */
export function prefetchDockWidgetIntentDebounced(widgetId: HomeWidgetId): void {
    const now = Date.now();
    const last = lastPrefetchAt.get(widgetId) ?? 0;
    if (now - last < DOCK_PREFETCH_COOLDOWN_MS) return;
    lastPrefetchAt.set(widgetId, now);
    runPrefetch(widgetId, 'hover');
}

/** prefetch فوري — يتجاوز cooldown؛ phase افتراضي open (مسار النقر الكامل) */
export function prefetchDockWidgetIntentImmediate(
    widgetId: HomeWidgetId,
    phase: DockWidgetPrefetchPhase = 'open',
): void {
    lastPrefetchAt.set(widgetId, Date.now());
    runPrefetch(widgetId, phase);
}

/** prefetch تدريجي عند الخمول لأيقونات الدوك المرئية — cold open أخف */
export function scheduleVisibleDockWidgetsPrefetch(widgetIds: readonly HomeWidgetId[]): () => void {
    if (typeof window === 'undefined' || widgetIds.length === 0) return () => undefined;
    const eligibleWidgetIds = widgetIds.filter((widgetId) => !HEAVY_IDLE_PREFETCH_WIDGETS.has(widgetId));
    if (eligibleWidgetIds.length === 0) return () => undefined;

    const key = eligibleWidgetIds.join('|');
    if (idleScheduledKeys.has(key)) return () => undefined;
    idleScheduledKeys.add(key);

    let cancelled = false;

    const run = () => {
        if (cancelled || document.hidden) return;
        clearStaggerTimers();
        eligibleWidgetIds.forEach((widgetId, index) => {
            staggerTimerIds.push(
                window.setTimeout(() => {
                    if (!cancelled && !document.hidden) prefetchDockWidgetIntentDebounced(widgetId);
                }, index * DOCK_IDLE_STAGGER_MS),
            );
        });
    };

    if (typeof requestIdleCallback !== 'undefined') {
        idleCallbackId = requestIdleCallback(run, { timeout: 6_000 });
    } else {
        idleFallbackTimerId = window.setTimeout(run, 2_000);
    }

    return () => {
        cancelled = true;
        cancelIdlePrefetchSchedule();
        idleScheduledKeys.delete(key);
    };
}

/** موجة idle منخفضة الأولوية للأقسام الثقيلة — بعد استقرار الإقلاع */
export function scheduleHeavyDockWidgetsIdlePrefetch(widgetIds: readonly HomeWidgetId[]): () => void {
    if (typeof window === 'undefined' || widgetIds.length === 0) return () => undefined;
    const heavyWidgetIds = widgetIds.filter((widgetId) => HEAVY_IDLE_PREFETCH_WIDGETS.has(widgetId));
    if (heavyWidgetIds.length === 0) return () => undefined;

    const key = heavyWidgetIds.join('|');
    if (heavyIdleScheduledKeys.has(key)) return () => undefined;
    heavyIdleScheduledKeys.add(key);

    let cancelled = false;
    let delayTimer: number | null = null;

    const run = () => {
        if (cancelled || document.hidden) return;
        clearStaggerTimers();
        heavyWidgetIds.forEach((widgetId, index) => {
            staggerTimerIds.push(
                window.setTimeout(() => {
                    if (!cancelled && !document.hidden) {
                        prefetchDockWidgetIntentDebounced(widgetId);
                    }
                }, index * HEAVY_DOCK_IDLE_STAGGER_MS),
            );
        });
    };

    delayTimer = window.setTimeout(run, HEAVY_DOCK_IDLE_DELAY_MS);

    return () => {
        cancelled = true;
        if (delayTimer != null) window.clearTimeout(delayTimer);
        clearStaggerTimers();
        heavyIdleScheduledKeys.delete(key);
    };
}

/** تسخين/تحضير المؤشر عند hover — نفس منطق الشريط السفلي القديم */
export function bindDockWidgetPointerHandlers(widgetId: HomeWidgetId): {
    onPointerEnter: () => void;
    onPointerDown: () => void;
    onFocus: () => void;
} {
    const runPrefetch = () => prefetchDockWidgetIntentDebounced(widgetId);
    const onPointerDown = () => {
        if (widgetId === 'dockTasks') {
            dispatchFieldTasksPrimeHost();
            prefetchDockWidgetIntentImmediate('dockTasks', 'hover');
            return;
        }
        if (widgetId === 'dockCalendar') {
            queueMicrotask(() => {
                dispatchSchedulePrimeHost();
                prefetchDockWidgetIntentImmediate('dockCalendar', 'hover');
            });
            return;
        }
        if (
            widgetId === 'dockRepository' ||
            widgetId === 'dockNotepad' ||
            widgetId === 'dockVault'
        ) {
            prefetchDockWidgetIntentImmediate('dockRepository', 'hover');
            void import('@/app/runtime/repositoryBootHydrator')
                .then((m) => m.dispatchRepositoryPrimeHost())
                .catch(() => undefined);
            return;
        }
        runPrefetch();
    };
    return {
        onPointerEnter: runPrefetch,
        onPointerDown,
        onFocus: runPrefetch,
    };
}
