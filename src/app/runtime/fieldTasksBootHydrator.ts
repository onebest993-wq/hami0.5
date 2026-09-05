import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';
import {
    hydrateFieldTasksSheetForInstantOpen,
    isFieldTasksSheetModuleResolved,
    prefetchFieldTasksSheetModule,
} from '@/app/runtime/fieldTasksHubLoader';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';

let bootHydratorArmed = false;
let hydrateInflight: Promise<boolean> | null = null;
let coldBootPrefetchStarted = false;

function fieldTasksBackgroundPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

/** كِسرة الستارة بعد أول إطار — lite محلي؛ الشبكة البطيئة تُحجب. */
function fieldTasksLiteSheetPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed({ allowOnLite: true, allowOnLocalOnly: true });
}

function hydrateDelayMs(): number {
    if (!fieldTasksBackgroundPrefetchAllowed()) return -1;
    return 0;
}

function scheduleCurtainPeekAfterFirstPaint(): void {
    void import('@/app/utils/quantumTasksCurtainPeek')
        .then((m) => {
            m.publishFieldTasksCurtainPeekFromDiskSync();
            m.scheduleFieldTasksCurtainPeekFromSecureStore();
        })
        .catch(() => undefined);
}

function warmFieldTasksBootPrefetch(): void {
    void import('@/app/utils/quantumTasksStorage')
        .then((m) => m.warmQuantumTasksDiskRead())
        .catch(() => undefined);
    if (fieldTasksLiteSheetPrefetchAllowed()) {
        prefetchFieldTasksSheetModule();
    }
    if (fieldTasksBackgroundPrefetchAllowed()) {
        void hydrateFieldTasksShellForInstantOpen(false);
    }
}

/**
 * بعد boot-reveal — ليس أول إطار للمنزل.
 * فكّ مفتاح المهام محلياً؛ كِسرة الستارة إن سُمح؛ hydrate فقط خارج lite.
 */
export function prefetchFieldTasksAfterBootReveal(): void {
    if (typeof window === 'undefined' || coldBootPrefetchStarted) return;
    coldBootPrefetchStarted = true;
    scheduleCurtainPeekAfterFirstPaint();
    warmFieldTasksBootPrefetch();
}

/**
 * تهيئة ستارة الميدان للفتح الفوري — مقطع Entry فقط (بلا أجندة).
 * @param force يتجاوز تعطيل prefetch عند فتح المستخدم.
 */
export function hydrateFieldTasksShellForInstantOpen(force = false): Promise<boolean> {
    if (!force && !fieldTasksBackgroundPrefetchAllowed()) return Promise.resolve(false);
    if (isFieldTasksSheetModuleResolved()) {
        return Promise.resolve(true);
    }
    if (hydrateInflight) return hydrateInflight;

    hydrateInflight = hydrateFieldTasksSheetForInstantOpen().finally(() => {
        hydrateInflight = null;
    });

    return hydrateInflight;
}

/** يُجدول التحميل بعد dashboard-interactive — بلا تأخير على المسار الحرج */
export function bindFieldTasksBootHydrator(): () => void {
    if (typeof window === 'undefined' || bootHydratorArmed) return () => undefined;
    bootHydratorArmed = true;

    let cancelIdle: (() => void) | undefined;

    const onBootRevealDone = () => {
        prefetchFieldTasksAfterBootReveal();
    };

    const scheduleHydrate = () => {
        prefetchFieldTasksAfterBootReveal();
        const delay = hydrateDelayMs();
        if (delay < 0) return;
        cancelIdle?.();
        cancelIdle = scheduleIdleWork(
            () => {
                prefetchFieldTasksSheetModule();
                void hydrateFieldTasksShellForInstantOpen().catch(() => undefined);
            },
            { minDelayMs: delay, timeoutMs: 8_000 },
        );
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone, { once: true });
    if (isBootRevealDone()) {
        queueMicrotask(onBootRevealDone);
    }

    window.addEventListener('hami:dashboard-interactive', scheduleHydrate, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        scheduleHydrate();
    }

    return () => {
        bootHydratorArmed = false;
        cancelIdle?.();
        cancelIdle = undefined;
        window.removeEventListener(BOOT_REVEAL_DONE_EVENT, onBootRevealDone);
        window.removeEventListener('hami:dashboard-interactive', scheduleHydrate);
    };
}

/** للاختبارات */
export function resetFieldTasksBootHydratorForTests(): void {
    bootHydratorArmed = false;
    hydrateInflight = null;
    coldBootPrefetchStarted = false;
}
