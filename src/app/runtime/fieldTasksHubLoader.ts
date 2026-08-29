import type { ComponentProps, ComponentType } from 'react';

type FieldTasksOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry');
type TasksManagerOverlayModule =
    typeof import('@/app/components/lawyer/dashboard/TasksManagerOverlay');

type TasksManagerOverlayProps = ComponentProps<TasksManagerOverlayModule['TasksManagerOverlay']>;

export type TasksManagerOverlayComponent = ComponentType<TasksManagerOverlayProps>;

/**
 * تحميل قسم المهام مقسوم إلى مسارين:
 * - الستارة: مقطع Entry (Host + BottomSheet ثابتان) — أول نقرة «مهام».
 * - الأجندة: chunk مستقل يُحمَّل عند «إدارة الكل» فقط.
 */

let overlayEntryPromise: Promise<FieldTasksOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

let managerModulePromise: Promise<TasksManagerOverlayModule> | null = null;
let cachedTasksManagerOverlay: TasksManagerOverlayComponent | null = null;

export function isFieldTasksSheetModuleResolved(): boolean {
    return overlayEntryResolved;
}

export function isTasksManagerModuleResolved(): boolean {
    return cachedTasksManagerOverlay !== null;
}

export function getCachedTasksManagerOverlay(): TasksManagerOverlayComponent | null {
    return cachedTasksManagerOverlay;
}

/** للاختبارات */
export function resetFieldTasksHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
    managerModulePromise = null;
    cachedTasksManagerOverlay = null;
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
    return ensureOverlayEntry();
}

export function loadTasksManagerModule(): Promise<TasksManagerOverlayModule> {
    return ensureManagerModulePromise();
}

export function prefetchFieldTasksSheetModule(): void {
    if (typeof window === 'undefined') return;
    void ensureOverlayEntry().catch(() => undefined);
}

export function prefetchTasksManagerModule(): void {
    if (typeof window === 'undefined') return;
    void ensureManagerModulePromise();
}

export function hydrateFieldTasksSheetForInstantOpen(): Promise<boolean> {
    return ensureOverlayEntry()
        .then(() => overlayEntryResolved)
        .catch(() => false);
}
