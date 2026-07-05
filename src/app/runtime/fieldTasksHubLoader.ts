import type { ComponentProps, ComponentType } from 'react';

type FieldTasksBottomSheetModule =
    typeof import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet');
type TasksManagerOverlayModule =
    typeof import('@/app/components/lawyer/dashboard/TasksManagerOverlay');

type FieldTasksBottomSheetProps = ComponentProps<FieldTasksBottomSheetModule['FieldTasksBottomSheet']>;
type TasksManagerOverlayProps = ComponentProps<TasksManagerOverlayModule['TasksManagerOverlay']>;

export type FieldTasksBottomSheetComponent = ComponentType<FieldTasksBottomSheetProps>;
export type TasksManagerOverlayComponent = ComponentType<TasksManagerOverlayProps>;

/**
 * تحميل قسم المهام مقسوم إلى chunk‌ين مستقلين:
 * - الستارة (sheet): خفيفة، تُفتح فوراً عند نقر «مهام».
 * - الأجندة (manager overlay): أثقل، تُحمّل فقط عند «إدارة الكل».
 * هذا يمنع انتظار المستخدم لتحميل الأجندة الكاملة قبل ظهور الستارة.
 */

let sheetModulePromise: Promise<FieldTasksBottomSheetModule> | null = null;
let managerModulePromise: Promise<TasksManagerOverlayModule> | null = null;

let cachedFieldTasksBottomSheet: FieldTasksBottomSheetComponent | null = null;
let cachedTasksManagerOverlay: TasksManagerOverlayComponent | null = null;

export function isFieldTasksSheetModuleResolved(): boolean {
    return cachedFieldTasksBottomSheet !== null;
}

export function isTasksManagerModuleResolved(): boolean {
    return cachedTasksManagerOverlay !== null;
}

/** @deprecated استخدم isFieldTasksSheetModuleResolved — يبقى للتوافق */
export function isFieldTasksHubModuleResolved(): boolean {
    return isFieldTasksSheetModuleResolved();
}

export function getCachedFieldTasksBottomSheet(): FieldTasksBottomSheetComponent | null {
    return cachedFieldTasksBottomSheet;
}

export function getCachedTasksManagerOverlay(): TasksManagerOverlayComponent | null {
    return cachedTasksManagerOverlay;
}

/** للاختبارات */
export function resetFieldTasksHubModuleCacheForTests(): void {
    sheetModulePromise = null;
    managerModulePromise = null;
    cachedFieldTasksBottomSheet = null;
    cachedTasksManagerOverlay = null;
}

function ensureSheetModulePromise(): Promise<FieldTasksBottomSheetModule> {
    if (!sheetModulePromise) {
        sheetModulePromise = import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet')
            .then((mod) => {
                if (mod?.FieldTasksBottomSheet) {
                    cachedFieldTasksBottomSheet = mod.FieldTasksBottomSheet;
                }
                return mod;
            })
            .catch((err) => {
                sheetModulePromise = null;
                throw err;
            });
    }
    return sheetModulePromise;
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

/** يحمّل ستارة الميدان فقط */
export function loadFieldTasksSheetModule(): Promise<FieldTasksBottomSheetModule> {
    return ensureSheetModulePromise();
}

/** يحمّل أجندة المهام (overlay + manager) فقط */
export function loadTasksManagerModule(): Promise<TasksManagerOverlayModule> {
    return ensureManagerModulePromise();
}

/** prefetch الستارة — أولوية عالية (تُفتح أولاً) */
export function prefetchFieldTasksSheetModule(): void {
    if (typeof window === 'undefined') return;
    void ensureSheetModulePromise();
}

/** prefetch الأجندة — أولوية أدنى */
export function prefetchTasksManagerModule(): void {
    if (typeof window === 'undefined') return;
    void ensureManagerModulePromise();
}

/** prefetch كلا الـ chunkين — الستارة أولاً ثم الأجندة */
export function prefetchFieldTasksHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureSheetModulePromise();
    void ensureManagerModulePromise();
}

/** يضمن جاهزية الستارة للفتح الفوري */
export function hydrateFieldTasksSheetForInstantOpen(): Promise<boolean> {
    return ensureSheetModulePromise()
        .then(() => true)
        .catch(() => false);
}

/** يضمن جاهزية chunk المهام كاملاً (الستارة + الأجندة) */
export function hydrateFieldTasksHubForInstantOpen(): Promise<boolean> {
    return Promise.all([ensureSheetModulePromise(), ensureManagerModulePromise()])
        .then(() => true)
        .catch(() => false);
}
