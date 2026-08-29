/**
 * تحميل مرحلي لإضبارة الدعوى — shell + widgets قبل النقر.
 */
import { prefetchSmartFileModalShellWidgets } from '@/app/components/lawyer/smart-modal/lazySmartFileModalWidgets';
import { prefetchPersonalStatusDossierSurface } from '@/app/components/lawyer/personal-status/personalStatusDossierLazy';

type SmartFileModalModule = typeof import('@/app/components/lawyer/SmartFileModal');

let smartFileModulePromise: Promise<SmartFileModalModule> | null = null;

export function resetSmartFileModalModuleCache(): void {
    smartFileModulePromise = null;
}

function createSmartFileModuleImport(): Promise<SmartFileModalModule> {
    void import('@/app/runtime/deferredFeatureStyles')
        .then((m) => m.ensureDeferredSmartDossierStylesLoaded())
        .catch(() => undefined);
    return import('@/app/components/lawyer/SmartFileModal').catch((err) => {
        smartFileModulePromise = null;
        throw err;
    });
}

export function loadSmartFileModalModule(): Promise<SmartFileModalModule> {
    if (!smartFileModulePromise) {
        smartFileModulePromise = createSmartFileModuleImport();
    }
    return smartFileModulePromise;
}

function prefetchSmartFileModalShell(): void {
    void import('@/app/components/lawyer/smart-modal/modals/contentEntryModals').catch(() => undefined);
    prefetchSmartFileModalShellWidgets();
    void import('@/app/components/lawyer/smart-modal/layout/SmartFileChrome').catch(() => undefined);
    void import('@/app/components/lawyer/smart-modal/layout/SmartFileModalsPortal').catch(() => undefined);
    void import('@/app/components/lawyer/smart-modal/layout/SmartFileMainPanel').catch(() => undefined);
    prefetchPersonalStatusDossierSurface();
}

/** مرحلة 1: الإضبارة + الهيكل فوراً؛ مرحلة 2: modals ثانوية عند الخمول */
export function prefetchSmartFileModalPhased(): void {
    if (typeof window === 'undefined') return;

    void loadSmartFileModalModule().catch(() => undefined);
    prefetchSmartFileModalShell();

    const scheduleSecondary = () => {
        void import('@/app/components/lawyer/smart-modal/lazySmartFileModalChunks').catch(() => undefined);
        void import('@/app/components/lawyer/smart-modal/modals/EditCaseInfoModal').catch(() => undefined);
        void import('@/app/components/lawyer/smart-modal/modals/flow-modals/TrashModal').catch(() => undefined);
        prefetchPersonalStatusDossierSurface();
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(scheduleSecondary, { timeout: 300 });
    } else {
        window.setTimeout(scheduleSecondary, 80);
    }
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        smartFileModulePromise = null;
    });
}
