import { markNotificationPanelModuleResolved } from '@/app/runtime/notificationPanelModuleState';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type NotificationShellModule =
    typeof import('@/app/components/lawyer/NotificationPanel/NotificationShell');

let shellPromise: Promise<NotificationShellModule> | null = null;

function ensureShellPromise(): Promise<NotificationShellModule> {
    if (!shellPromise) {
        shellPromise = import('@/app/components/lawyer/NotificationPanel/NotificationShell').then(
            (mod) => {
                /* الشِل يضم Host→Panel ساكناً — الوسم يمنع تسخين لوحة مكرّر */
                markNotificationPanelModuleResolved();
                return mod;
            },
        );
    }
    return shellPromise;
}

export const LazyNotificationShell = createPreloadableLazyComponent(() =>
    ensureShellPromise().then((m) => ({
        default: m.NotificationShell as unknown as LazyComponent,
    })),
);

export function prefetchNotificationShellModule(): void {
    if (typeof window === 'undefined') return;
    void LazyNotificationShell.preload();
}

export function loadNotificationShellModule(): Promise<NotificationShellModule> {
    void LazyNotificationShell.preload();
    return ensureShellPromise();
}

export function resetNotificationShellModuleCacheForTests(): void {
    shellPromise = null;
    LazyNotificationShell.resetForTests();
}