import type { ComponentProps, ComponentType } from 'react';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type FieldTasksOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry');
type TasksManagerOverlayModule =
    typeof import('@/app/components/lawyer/dashboard/TasksManagerOverlay');

type TasksManagerOverlayProps = ComponentProps<TasksManagerOverlayModule['TasksManagerOverlay']>;

type TasksManagerOverlayComponent = ComponentType<TasksManagerOverlayProps>;

/**
 * تحميل قسم المهام مقسوم إلى مسارين:
 * - الستارة: مقطع Entry (Host + BottomSheet ثابتان) — أول نقرة «مهام».
 * - الأجندة: chunk Overlay/TasksManager/TaskCard عند «إدارة الكل» — Host داخل Entry فلا يُستورد هنا.
 */

let overlayEntryPromise: Promise<FieldTasksOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

let managerModulePromise: Promise<TasksManagerOverlayModule> | null = null;
let cachedTasksManagerOverlay: TasksManagerOverlayComponent | null = null;

export function isFieldTasksSheetModuleResolved(): boolean {
    return overlayEntryResolved;
}

export function getCachedTasksManagerOverlay(): TasksManagerOverlayComponent | null {
    return cachedTasksManagerOverlay;
}

function ensureOverlayEntry(): Promise<FieldTasksOverlayEntryModule> {
    if (!overlayEntryPromise) {
        overlayEntryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry'
        )
            .then((mod) => {
                overlayEntryResolved = Boolean(mod.LawyerDashboardFieldTasksOverlayEntry);
                return mod;
            })
            .catch((err) => {
                overlayEntryPromise = null;
                overlayEntryResolved = false;
                throw err;
            });
    }
    return overlayEntryPromise;
}

export const LazyFieldTasksOverlayEntry = createPreloadableLazyComponent(() =>
    ensureOverlayEntry().then((m) => ({
        default: m.LawyerDashboardFieldTasksOverlayEntry as unknown as LazyComponent,
    })),
);

/** للاختبارات */
export function resetFieldTasksHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
    managerModulePromise = null;
    cachedTasksManagerOverlay = null;
    LazyFieldTasksOverlayEntry.resetForTests();
}

function ensureManagerModulePromise(): Promise<TasksManagerOverlayModule> {
    if (!managerModulePromise) {
        managerModulePromise = import('@/app/components/lawyer/dashboard/TasksManagerOverlay')
            .then((mod) => {
                if (mod?.TasksManagerOverlay) {
                    cachedTasksManagerOverlay = mod.TasksManagerOverlay;
                }
                return mod;
            })
            .catch((err) => {
                managerModulePromise = null;
                throw err;
            });
    }
    return managerModulePromise;
}

/** مقطع Entry (Host + الستارة ثابتان داخله) */
export function loadFieldTasksSheetModule(): Promise<FieldTasksOverlayEntryModule> {
    void LazyFieldTasksOverlayEntry.preload();
    return ensureOverlayEntry();
}

export function loadTasksManagerModule(): Promise<TasksManagerOverlayModule> {
    return ensureManagerModulePromise();
}

export function prefetchFieldTasksSheetModule(): void {
    if (typeof window === 'undefined') return;
    void LazyFieldTasksOverlayEntry.preload();
}

/** صوت / فرعي / دبوس / حتمي — بعد مقطع الستارة حتى لا تنتظر البطاقة كسلاً ثانياً */
export function prefetchFieldTasksCurtainCardSurfaces(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainWorkspacePin');
    void import('@/app/components/lawyer/dashboard/tasksManager/TaskVoicePlayback');
    void import('@/app/components/lawyer/dashboard/tasksManager/TaskSubTasksCollapsible');
    void import('@/app/components/lawyer/dashboard/fieldTasks/FieldTasksFatalDialog');
}

export function prefetchTasksManagerModule(): void {
    if (typeof window === 'undefined') return;
    void ensureManagerModulePromise();
}

/** `npm run dev`: حوّل شجرة أول طلاء للأجندة بالتوازي — لا يحمّل مقطع الإنتاج ولا يُستدعى عند hover */
export function warmTasksManagerAgendaDevTransforms(): void {
    if (!import.meta.env.DEV || typeof fetch === 'undefined') return;
    void fetch('/hami-dev/warm-tasks-manager-agenda', { cache: 'no-store' }).catch(() => undefined);
}

/** حتمي/بعيد/حوار الأجندة — بعد مقطع الأجندة حتى لا تنتظر الأقسام الثانوية */
export function prefetchTasksManagerSecondarySurfaces(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/tasksManager/FatalDeadlinesSection');
    void import('@/app/components/lawyer/dashboard/tasksManager/DistantTasksSection');
    void import('@/app/components/lawyer/dashboard/tasksManager/TasksManagerFatalDialog');
}

export function hydrateFieldTasksSheetForInstantOpen(): Promise<boolean> {
    return LazyFieldTasksOverlayEntry.preload().then(() => overlayEntryResolved);
}
