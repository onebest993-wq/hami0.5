/**
 * مضيف تبويب الملف في MainView — preload-aware بلا برميل lazyEntries.
 */
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type ProfileTabHostModule = typeof import('@/app/components/lawyer/dashboard/profile/ProfileTabHost');

let hostPromise: Promise<ProfileTabHostModule> | null = null;

function ensureProfileTabHost(): Promise<ProfileTabHostModule> {
    if (!hostPromise) {
        hostPromise = import('@/app/components/lawyer/dashboard/profile/ProfileTabHost');
    }
    return hostPromise;
}

export const LazyProfileTabHost = createPreloadableLazyComponent(() =>
    ensureProfileTabHost().then((m) => ({
        default: m.ProfileTabHost as unknown as LazyComponent,
    })),
);

export function prefetchProfileTabHost(): void {
    if (typeof window === 'undefined') return;
    void LazyProfileTabHost.preload();
}

export function loadProfileTabHostModule(): Promise<ProfileTabHostModule> {
    void LazyProfileTabHost.preload();
    return ensureProfileTabHost();
}

export function resetProfileTabHostLoaderForTests(): void {
    hostPromise = null;
    LazyProfileTabHost.resetForTests();
}
