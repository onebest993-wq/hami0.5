import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import type { SmartFileModalProps } from '@/app/components/lawyer/smart-modal/smartFile/smartFileModalTypes';
import { HUB_DOSSIER_Z_CLASS } from '@/app/components/lawyer/shared/hubZLayers';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';
import { loadSmartFileModalModule } from '@/app/runtime/smartFileModalLoader';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { SmartFileModalBootChrome } from '@/app/components/lawyer/dashboard/SmartFileModalBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

type FileLike = SmartFileModalProps['file'] & { id?: unknown };

const LazySmartFileModal = createPreloadableLazyComponent(() =>
    loadSmartFileModalModule().then((mod) => ({
        default: mod.SmartFileModal as unknown as LazyComponent,
    })),
);

if (typeof window !== 'undefined') {
    void LazySmartFileModal.preload();
}

/** اختيار أحدث صف من قائمة جاهزة — بلا قراءة قرص. */
export function pickFreshSmartFileModalFile(
    file: SmartFileModalProps['file'],
    storedFiles: unknown[],
): SmartFileModalProps['file'] {
    const targetId = String((file as FileLike | undefined)?.id ?? '').trim();
    if (!targetId) return file;

    const fresh = storedFiles.find(
        (entry) => String((entry as { id?: unknown } | undefined)?.id ?? '').trim() === targetId,
    );
    if (!fresh) return file;
    /* ادمج حتى لا تُمحى هوية الفتح (اختصاص/قاضي) إن كان صف القرص أنقص */
    return { ...file, ...(fresh as SmartFileModalProps['file']) };
}

function LawsuitDossierCrashFallback({ onClose }: { onClose: () => void }) {
    return (
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_Z_CLASS} flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
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
 * أول إطار من ذاكرة المساحة؛ تحديث القرص بعد الظهور حتى لا يُحجب الفتح بقراءة SecureStore.
 */
export function SmartFileModalPortal(props: SmartFileModalProps) {
    const [hydratedFile, setHydratedFile] = useState(props.file);
    const [dossierPainted, setDossierPainted] = useState(false);

    useEffect(() => {
        setHydratedFile(props.file);
        const targetId = String((props.file as FileLike | undefined)?.id ?? '').trim();
        if (!targetId) return undefined;
        let cancelled = false;
        void import('@/app/utils/lawsuitFilesStorage')
            .then((m) => {
                if (cancelled) return;
                setHydratedFile(pickFreshSmartFileModalFile(props.file, m.loadLawsuitFilesRaw()));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [props.file]);

    const surfaceActive = props.surfaceActive !== false;
    const coverWhilePending = props.coverWhilePending !== false;
    const fileId = (hydratedFile as { id?: unknown } | undefined)?.id;
    const onPaintedProp = props.onPainted;

    const handlePainted = useCallback(() => {
        setDossierPainted(true);
        onPaintedProp?.();
    }, [onPaintedProp]);

    const showBootCover = coverWhilePending && surfaceActive && !dossierPainted;

    const layer = (
        <ErrorBoundary
            fallback={<LawsuitDossierCrashFallback onClose={props.onClose} />}
            onError={(error, errorInfo) => {
                console.error('[LawsuitDossier] crash:', error);
                console.error('[LawsuitDossier] component stack:', errorInfo.componentStack);
            }}
        >
            {showBootCover ? (
                <SmartFileModalBootChrome
                    file={hydratedFile as FileData}
                    onClose={props.onClose}
                />
            ) : null}
            <Suspense
                fallback={
                    showBootCover ? null : coverWhilePending ? (
                        <SmartFileModalBootChrome
                            file={hydratedFile as FileData}
                            onClose={props.onClose}
                        />
                    ) : null
                }
            >
                <LazySmartFileModal
                    key={`lawsuit-${String(fileId ?? 'unknown')}`}
                    {...props}
                    file={hydratedFile}
                    surfaceActive={surfaceActive}
                    onPainted={handlePainted}
                />
            </Suspense>
        </ErrorBoundary>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
