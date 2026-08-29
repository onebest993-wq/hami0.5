import type { ComponentProps, ComponentType } from 'react';

type NotificationShellModule =
    typeof import('@/app/components/lawyer/NotificationPanel/NotificationShell');

export type NotificationShellComponent = ComponentType<
    ComponentProps<NotificationShellModule['NotificationShell']>
>;

let shellPromise: Promise<NotificationShellModule> | null = null;
let resolvedShell: NotificationShellModule | null = null;

export function prefetchNotificationShellModule(): void {
    if (typeof window === 'undefined') return;
    void ensureShellPromise().catch(() => undefined);
}

export function loadNotificationShellModule(): Promise<NotificationShellModule> {
    return ensureShellPromise();
}

export function isNotificationShellModuleResolved(): boolean {
    return resolvedShell !== null;
}

/** للاختبارات */
export function resetNotificationShellLoaderForTests(): void {
    shellPromise = null;
    resolvedShell = null;
}

function ensureShellPromise(): Promise<NotificationShellModule> {
    if (!shellPromise) {
        shellPromise = import('@/app/components/lawyer/NotificationPanel/NotificationShell').then(
            (mod) => {
                resolvedShell = mod;
                return mod;
            },
        );
    }
    return shellPromise;
}
