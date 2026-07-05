import type { ComponentType } from 'react';
import type { SmartRepositoryModalProps } from '@/app/components/lawyer/SmartRepositoryModal';

type RepositoryHubModule = typeof import('@/app/components/lawyer/SmartRepositoryModal');

export type SmartRepositoryModalComponent = ComponentType<SmartRepositoryModalProps>;

let hubModulePromise: Promise<RepositoryHubModule> | null = null;
let cachedSmartRepositoryModal: SmartRepositoryModalComponent | null = null;

export function isRepositoryHubModuleResolved(): boolean {
    return cachedSmartRepositoryModal !== null;
}

export function getCachedSmartRepositoryModal(): SmartRepositoryModalComponent | null {
    return cachedSmartRepositoryModal;
}

/** للاختبارات */
export function resetRepositoryHubModuleCacheForTests(): void {
    hubModulePromise = null;
    cachedSmartRepositoryModal = null;
}

function ensureRepositoryHubModulePromise(): Promise<RepositoryHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/SmartRepositoryModal')
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

export function loadRepositoryHubModule(): Promise<RepositoryHubModule> {
    return ensureRepositoryHubModulePromise();
}

/** Prefetch chunk المستودع الذكي الموحّد — يُستدعى من hover الدوك */
export function prefetchRepositoryHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureRepositoryHubModulePromise().catch(() => undefined);
}

/** يضمن جاهزية shell المستودع للفتح الفوري */
export function hydrateRepositoryShellForInstantOpen(): Promise<boolean> {
    return ensureRepositoryHubModulePromise()
        .then(() => true)
        .catch(() => false);
}
