import type { ComponentType } from 'react';

type ArchivePortalModule = typeof import('@/app/components/lawyer/ArchivePortal.tsx');
type LawsuitsWorkspaceModule = typeof import('@/app/components/lawyer/LawsuitsWorkspace');

export type ArchivePortalComponent = ArchivePortalModule['ArchivePortal'];
export type LawsuitsWorkspaceComponent = LawsuitsWorkspaceModule['LawsuitsWorkspace'];

const LOAD_TIMEOUT_MS = 18_000;

let archivePortalPromise: Promise<ArchivePortalModule> | null = null;
let lawsuitsWorkspacePromise: Promise<LawsuitsWorkspaceModule> | null = null;
let cachedArchivePortal: ArchivePortalComponent | null = null;
let cachedLawsuitsWorkspace: LawsuitsWorkspaceComponent | null = null;

const archivePortalListeners = new Set<() => void>();

function notifyArchivePortalListeners(): void {
    archivePortalListeners.forEach((listener) => listener());
}

export function subscribeArchivePortalCache(listener: () => void): () => void {
    archivePortalListeners.add(listener);
    return () => {
        archivePortalListeners.delete(listener);
    };
}

export function getCachedArchivePortal(): ArchivePortalComponent | null {
    return cachedArchivePortal;
}

export function getCachedLawsuitsWorkspace(): LawsuitsWorkspaceComponent | null {
    return cachedLawsuitsWorkspace;
}

export function resetArchivePortalModuleCacheForTests(): void {
    archivePortalPromise = null;
    cachedArchivePortal = null;
    notifyArchivePortalListeners();
}

export function resetHubArchiveModuleCacheForTests(): void {
    archivePortalPromise = null;
    lawsuitsWorkspacePromise = null;
    cachedArchivePortal = null;
    cachedLawsuitsWorkspace = null;
    notifyArchivePortalListeners();
}

export function invalidateArchivePortalModuleCache(): void {
    archivePortalPromise = null;
    cachedArchivePortal = null;
    notifyArchivePortalListeners();
}

function withLoadTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error(`انتهت مهلة تحميل ${label}. تحقق من الاتصال ثم أعد المحاولة.`));
        }, LOAD_TIMEOUT_MS);

        promise
            .then((value) => {
                window.clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                window.clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function ensureArchivePortalPromise(): Promise<ArchivePortalModule> {
    if (!archivePortalPromise) {
        archivePortalPromise = withLoadTimeout(
            import('@/app/components/lawyer/ArchivePortal.tsx'),
            'أرشيف الإضابير',
        )
            .then((mod) => {
                cachedArchivePortal = mod.ArchivePortal;
                notifyArchivePortalListeners();
                return mod;
            })
            .catch((error) => {
                archivePortalPromise = null;
                throw error;
            });
    }
    return archivePortalPromise;
}

function ensureLawsuitsWorkspacePromise(): Promise<LawsuitsWorkspaceModule> {
    if (!lawsuitsWorkspacePromise) {
        lawsuitsWorkspacePromise = withLoadTimeout(
            import('@/app/components/lawyer/LawsuitsWorkspace'),
            'مساحة الدعاوى',
        )
            .then((mod) => {
                cachedLawsuitsWorkspace = mod.LawsuitsWorkspace;
                return mod;
            })
            .catch((error) => {
                lawsuitsWorkspacePromise = null;
                throw error;
            });
    }
    return lawsuitsWorkspacePromise;
}

export function loadArchivePortalModule(): Promise<ArchivePortalModule> {
    return ensureArchivePortalPromise();
}

export function loadLawsuitsWorkspaceModule(): Promise<LawsuitsWorkspaceModule> {
    return ensureLawsuitsWorkspacePromise();
}

/** دعاوى — أرشيف + مستعجل (يُحمَّل عند التبويب) */
export function loadLawsuitArchiveHubModule(): Promise<ArchivePortalModule> {
    return loadArchivePortalModule();
}

/** تنفيذ — portal الإضابير */
export function loadExecutionArchiveHubModule(): Promise<ArchivePortalModule> {
    return loadArchivePortalModule();
}

export function prefetchLawsuitArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawsuitArchiveHubModule().catch(() => undefined);
}

export function prefetchExecutionArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadExecutionArchiveHubModule().catch(() => undefined);
}

export function hydrateArchiveHubForInstantOpen(archiveId: 'execution' | 'lawsuit'): Promise<boolean> {
    const loader =
        archiveId === 'lawsuit' ? loadLawsuitArchiveHubModule() : loadExecutionArchiveHubModule();
    return loader.then(() => true).catch(() => false);
}
