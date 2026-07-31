import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import type { ArchiveDossierViewMode } from '@/app/components/lawyer/ArchivePortal/components/ArchiveDossierToolbar';
import { ArchivePortalExecutionSurface } from '@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface';
import {
    getCachedArchivePortal,
    getLawsuitFileGridReady,
    invalidateArchivePortalModuleCache,
    loadArchivePortalModule,
    loadLawsuitArchiveHubModule,
    prefetchLawsuitArchiveContent,
    prefetchExecutionArchiveContent,
    subscribeArchivePortalCache,
    subscribeLawsuitFileGridReady,
    type ArchivePortalComponent,
} from '@/app/runtime/hubArchiveLoader';
import { ArchiveHubInstantShell, ArchiveHubLoadError } from './ArchiveHubInstantShell';
import {
    LawsuitsCivilArchiveInstantShell,
    type LawsuitShellLifecycleChrome,
} from './LawsuitsCivilArchiveInstantShell';

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

type ArchivePortalHostProps = ArchivePortalProps & {
    /** overlay = شاشة كاملة z-200؛ inline = داخل مساحة الدعاوى */
    loadingVariant?: 'overlay' | 'inline';
    initialLawsuitJurisdictionTab?: ArchivePortalProps['initialLawsuitJurisdictionTab'];
};

function ArchivePortalInlineLoadError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">{message}</p>
            <p className="text-white/45 text-[11px] leading-relaxed max-w-xs">
                إن استمر الخطأ بعد إعادة المحاولة، حدّث الصفحة (Ctrl+Shift+R).
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="min-h-[44px] rounded-xl px-4 py-2 border border-[#E6C673]/40 text-[#E6C673] text-xs font-bold touch-manipulation"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/**
 * Host الأرشيف — للتنفيذ يعتمد Portal فور وجوده في الكاش (بلا بوابة surface/grid متذبذبة).
 * Surface/FileGrid يُسخَّنان عبر loadExecutionArchiveHubModule ويُعرضان sync من الكاش.
 */
export function ArchivePortalHost({
    loadingVariant,
    onClose,
    type,
    embedded,
    initialLawsuitJurisdictionTab,
    ...rest
}: ArchivePortalHostProps): React.ReactElement {
    const resolvedLoadingVariant = loadingVariant ?? (embedded ? 'inline' : 'overlay');
    const cachedComponent = useSyncExternalStore(
        subscribeArchivePortalCache,
        getCachedArchivePortal,
        () => null,
    );
    const lawsuitFileGridReady = useSyncExternalStore(
        subscribeLawsuitFileGridReady,
        getLawsuitFileGridReady,
        () => false,
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);
    const [jurisdictionTab, setJurisdictionTab] = useState<
        NonNullable<ArchivePortalProps['initialLawsuitJurisdictionTab']>
    >(initialLawsuitJurisdictionTab ?? 'all');
    const [lifecycleChrome, setLifecycleChrome] = useState<LawsuitShellLifecycleChrome>(null);
    const [archiveScrollParent, setArchiveScrollParent] = useState<HTMLDivElement | null>(null);
    const [dossierSearchOpen, setDossierSearchOpen] = useState(true);
    const [dossierSearchQuery, setDossierSearchQuery] = useState('');
    const [dossierViewMode, setDossierViewMode] = useState<ArchiveDossierViewMode>('grid');

    const handleScrollParentRef = useCallback((el: HTMLDivElement | null) => {
        setArchiveScrollParent(el);
    }, []);

    useEffect(() => {
        if (initialLawsuitJurisdictionTab) {
            setJurisdictionTab(initialLawsuitJurisdictionTab);
        }
    }, [initialLawsuitJurisdictionTab]);

    const title =
        type === 'executions'
            ? 'مخزن الإضابير التنفيذية'
            : type === 'lawsuits'
              ? 'أرشيف الدعاوى'
              : 'أرشيف الإضابير';

    const inlineLoadErrorMessage =
        type === 'executions' ? 'تعذّر تحميل مخزن التنفيذ' : 'تعذّر تحميل قائمة الدعاوى';

    const retryLoad = useCallback(() => {
        invalidateArchivePortalModuleCache();
        setLoadFailed(false);
        setLoadGeneration((value) => value + 1);
    }, []);

    useEffect(() => {
        setLoadFailed(false);

        let cancelled = false;
        let attempts = 0;

        if (type === 'executions') {
            prefetchExecutionArchiveContent();
            return () => {
                cancelled = true;
            };
        }

        if (type === 'lawsuits') {
            prefetchLawsuitArchiveContent();
        }

        const adoptModule = () => {
            const loader =
                type === 'lawsuits' ? loadLawsuitArchiveHubModule() : loadArchivePortalModule();
            void loader
                .then(() => {
                    if (cancelled) return;
                    setLoadFailed(false);
                })
                .catch((error) => {
                    if (import.meta.env.DEV) {
                        console.error('[ArchivePortalHost] archive module load failed', error);
                    }
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        return () => {
            cancelled = true;
        };
    }, [loadGeneration, type]);

    const Component: ArchivePortalComponent | null = cachedComponent;

    if (type === 'executions') {
        return (
            <ArchivePortalExecutionSurface
                embedded={embedded}
                onClose={onClose}
                type={type}
                initialLawsuitJurisdictionTab={initialLawsuitJurisdictionTab}
                {...rest}
            />
        );
    }

    if (resolvedLoadingVariant === 'inline' && type === 'lawsuits') {
        if (loadFailed) {
            return <ArchivePortalInlineLoadError message={inlineLoadErrorMessage} onRetry={retryLoad} />;
        }

        return (
            <LawsuitsCivilArchiveInstantShell
                jurisdictionTab={jurisdictionTab}
                onJurisdictionTabChange={setJurisdictionTab}
                lifecycleChrome={lifecycleChrome}
                initialJurisdictionTab={initialLawsuitJurisdictionTab}
                searchOpen={dossierSearchOpen}
                onSearchOpenChange={setDossierSearchOpen}
                searchQuery={dossierSearchQuery}
                onSearchQueryChange={setDossierSearchQuery}
                viewMode={dossierViewMode}
                onViewModeChange={setDossierViewMode}
                onScrollParentRef={handleScrollParentRef}
            >
                {Component && lawsuitFileGridReady ? (
                    <Component
                        embedded={embedded}
                        onClose={onClose}
                        type={type}
                        gridOnly
                        initialLawsuitJurisdictionTab={jurisdictionTab}
                        onLawsuitShellChrome={setLifecycleChrome}
                        archiveScrollParent={archiveScrollParent}
                        dossierSearchOpen={dossierSearchOpen}
                        onDossierSearchOpenChange={setDossierSearchOpen}
                        dossierSearchQuery={dossierSearchQuery}
                        onDossierSearchQueryChange={setDossierSearchQuery}
                        dossierViewMode={dossierViewMode}
                        onDossierViewModeChange={setDossierViewMode}
                        {...rest}
                    />
                ) : null}
            </LawsuitsCivilArchiveInstantShell>
        );
    }

    if (Component) {
        return (
            <Component
                embedded={embedded}
                onClose={onClose}
                type={type}
                initialLawsuitJurisdictionTab={initialLawsuitJurisdictionTab}
                {...rest}
            />
        );
    }

    if (loadFailed) {
        if (resolvedLoadingVariant === 'inline') {
            return <ArchivePortalInlineLoadError message={inlineLoadErrorMessage} onRetry={retryLoad} />;
        }
        return (
            <ArchiveHubLoadError
                message="تعذّر تحميل الأرشيف"
                onRetry={retryLoad}
                onBack={onClose}
            />
        );
    }

    if (resolvedLoadingVariant === 'inline') {
        if (type === 'executions') {
            return <div className="h-full bg-[#0B1021]" aria-busy="true" />;
        }
    }

    return (
        <ArchiveHubInstantShell
            onBack={onClose}
            title={title}
            testId="archive-hub-loading"
        />
    );
}
