import type { ComponentType } from 'react';
import type { SmartRepositoryModalProps } from '@/app/components/lawyer/SmartRepository/SmartRepositoryModalEntry';
import type { SmartRepositoryUnifiedFeedProps } from '@/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed';

type RepositoryHubModule = typeof import('@/app/components/lawyer/SmartRepository/SmartRepositoryModalEntry');
type RepositoryFeedModule = typeof import('@/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed');

export type SmartRepositoryModalComponent = ComponentType<SmartRepositoryModalProps>;
export type SmartRepositoryUnifiedFeedComponent = ComponentType<SmartRepositoryUnifiedFeedProps>;

let hubModulePromise: Promise<RepositoryHubModule> | null = null;
let feedModulePromise: Promise<RepositoryFeedModule> | null = null;
let cachedSmartRepositoryModal: SmartRepositoryModalComponent | null = null;
let cachedUnifiedFeed: SmartRepositoryUnifiedFeedComponent | null = null;

export function isRepositoryHubModuleResolved(): boolean {
    return cachedSmartRepositoryModal !== null;
}

export function isRepositoryFeedModuleResolved(): boolean {
    return cachedUnifiedFeed !== null;
}

export function getCachedSmartRepositoryModal(): SmartRepositoryModalComponent | null {
    return cachedSmartRepositoryModal;
}

export function getCachedRepositoryUnifiedFeed(): SmartRepositoryUnifiedFeedComponent | null {
    return cachedUnifiedFeed;
}

/** للاختبارات */
export function resetRepositoryHubModuleCacheForTests(): void {
    hubModulePromise = null;
    feedModulePromise = null;
    cachedSmartRepositoryModal = null;
    cachedUnifiedFeed = null;
}

function ensureRepositoryHubModulePromise(): Promise<RepositoryHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/SmartRepository/SmartRepositoryModalEntry')
            .then((mod) => {
                if (mod?.SmartRepositoryModal) {
                    cachedSmartRepositoryModal = mod.SmartRepositoryModal;
                }
                return mod;
            })
            .catch((err) => {
                hubModulePromise = null;
                throw err;
            });
    }
    return hubModulePromise;
}

function ensureRepositoryFeedModulePromise(): Promise<RepositoryFeedModule> {
    if (!feedModulePromise) {
        feedModulePromise = import('@/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed')
            .then((mod) => {
                if (mod?.SmartRepositoryUnifiedFeed) {
                    cachedUnifiedFeed = mod.SmartRepositoryUnifiedFeed;
                }
                return mod;
            })
            .catch((err) => {
                feedModulePromise = null;
                throw err;
            });
    }
    return feedModulePromise;
}

export function loadRepositoryHubModule(): Promise<RepositoryHubModule> {
    return ensureRepositoryHubModulePromise();
}

export function loadRepositoryFeedComponent(): Promise<SmartRepositoryUnifiedFeedComponent | null> {
    return ensureRepositoryFeedModulePromise()
        .then(() => cachedUnifiedFeed)
        .catch(() => null);
}

/** Prefetch قشرة + تغذية — يُستدعى من hover/boot */
export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureRepositoryHubModulePromise().catch(() => undefined);
    prefetchRepositoryFeedModule();
}

/** Prefetch تغذية المستودع — المسار الحرج للفتح اللحظي */
export function prefetchRepositoryFeedModule(): void {
    if (typeof window === 'undefined') return;
    void ensureRepositoryFeedModulePromise().catch(() => undefined);
}

/** يضمن جاهزية قشرة المستودع (Modal) للفتح الفوري — التغذية ثانوية */
export function hydrateRepositoryShellForInstantOpen(): Promise<boolean> {
    return Promise.all([
        ensureRepositoryHubModulePromise(),
        ensureRepositoryFeedModulePromise().catch(() => null),
    ])
        .then(() => cachedSmartRepositoryModal != null)
        .catch(() => false);
}
