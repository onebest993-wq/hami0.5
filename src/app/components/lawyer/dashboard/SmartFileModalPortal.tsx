import React from 'react';
import { createPortal } from 'react-dom';

import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import type { SmartFileModalProps } from '@/app/components/lawyer/smart-modal/smartFile/smartFileModalTypes';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/shared/hubZLayers';
import { loadSmartFileModalModule } from '@/app/runtime/smartFileModalLoader';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type FileLike = SmartFileModalProps['file'] & { id?: unknown };

const LazySmartFileModal = createPreloadableLazyComponent(() =>
    loadSmartFileModalModule().then((mod) => ({
        default: mod.SmartFileModal as unknown as LazyComponent,
    })),
);

if (typeof window !== 'undefined') {
    void LazySmartFileModal.preload();
}

export function resolveFreshSmartFileModalFile(file: SmartFileModalProps['file']): SmartFileModalProps['file'] {
    const targetId = String((file as FileLike | undefined)?.id ?? '').trim();
    if (!targetId) return file;

    const storedFiles = loadLawsuitFilesRaw();
    const fresh = storedFiles.find(
        (entry) => String((entry as { id?: unknown } | undefined)?.id ?? '').trim() === targetId,
    );
    return (fresh as SmartFileModalProps['file'] | undefined) ?? file;
}

function LawsuitDossierCrashFallback({ onClose }: { onClose: () => void }) {
    return (
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_Z_CLASS} flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
            role="alertdialog"
            aria-modal="true"
            aria-label="تعذّر فتح الإضبارة"
            data-testid="lawsuit-dossier-error-fallback"
        >
            <p className="text-sm font-bold text-red-300">تعذّر تحميل إضبارة الدعوى</p>
            <p className="max-w-sm text-xs text-white/45">يمكنك الإغلاق والمحاولة مجدداً دون فقدان باقي التطبيق.</p>
            <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/40 px-4 text-xs font-bold text-[#E6C673] touch-manipulation"
            >
                إغلاق
            </button>
        </div>
    );
}

/**
 * إضبارة الدعوى — portal + عزل أعطال.
 * غلاف BootChrome يبقى في طبقة الـ overlays فقط (Suspense واحد — بلا تكرار).
 */
export function SmartFileModalPortal(props: SmartFileModalProps) {
    const hydratedFile = resolveFreshSmartFileModalFile(props.file);
    const fileId = (hydratedFile as { id?: unknown } | undefined)?.id;

    const layer = (
        <ErrorBoundary
            fallback={<LawsuitDossierCrashFallback onClose={props.onClose} />}
            onError={(error, errorInfo) => {
                console.error('[LawsuitDossier] crash:', error);
                console.error('[LawsuitDossier] component stack:', errorInfo.componentStack);
            }}
        >
            <LazySmartFileModal
                key={`lawsuit-${String(fileId ?? 'unknown')}`}
                {...props}
                file={hydratedFile}
            />
        </ErrorBoundary>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
