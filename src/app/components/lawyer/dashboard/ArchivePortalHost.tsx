import React, { useEffect, useState, useSyncExternalStore } from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import {
    getCachedArchivePortal,
    invalidateArchivePortalModuleCache,
    loadArchivePortalModule,
    subscribeArchivePortalCache,
    type ArchivePortalComponent,
} from '@/app/runtime/hubArchiveLoader';
import { ArchiveHubInstantShell, ArchiveHubLoadError } from './ArchiveHubInstantShell';
import { ExecutionArchiveTabLoading } from './ExecutionArchiveShell';
import { LawsuitsCivilArchiveInstantShell } from './LawsuitsCivilArchiveInstantShell';

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

type ArchivePortalHostProps = ArchivePortalProps & {
    /** overlay = شاشة كاملة z-200؛ inline = داخل مساحة الدعاوى */
    loadingVariant?: 'overlay' | 'inline';
    initialLawsuitJurisdictionTab?: ArchivePortalProps['initialLawsuitJurisdictionTab'];
};

function ArchivePortalInlineLoadError({
    onRetry,
}: {
    onRetry: () => void;
}) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-red-400 font-bold text-sm">تعذّر تحميل قائمة الدعاوى</p>
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
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const title =
        type === 'executions'
            ? 'مخزن الإضابير التنفيذية'
            : type === 'lawsuits'
              ? 'أرشيف الدعاوى'
              : 'أرشيف الإضابير';

    useEffect(() => {
        setLoadFailed(false);

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadArchivePortalModule()
                .then(() => {
                    if (cancelled) return;
                    setLoadFailed(false);
                })
                .catch(() => {
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
    }, [loadGeneration]);

    const Component: ArchivePortalComponent | null = cachedComponent;

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
            return (
                <ArchivePortalInlineLoadError
                    onRetry={() => {
                        invalidateArchivePortalModuleCache();
                        setLoadFailed(false);
                        setLoadGeneration((value) => value + 1);
                    }}
                />
            );
        }
        return (
            <ArchiveHubLoadError
                message="تعذّر تحميل الأرشيف"
                onRetry={() => {
                    invalidateArchivePortalModuleCache();
                    setLoadFailed(false);
                    setLoadGeneration((value) => value + 1);
                }}
                onBack={onClose}
            />
        );
    }

    if (resolvedLoadingVariant === 'inline') {
        if (type === 'executions') {
            return <ExecutionArchiveTabLoading />;
        }
        return (
            <LawsuitsCivilArchiveInstantShell initialJurisdictionTab={initialLawsuitJurisdictionTab} />
        );
    }

    return (
        <ArchiveHubInstantShell
            onBack={onClose}
            title={title}
            testId="archive-hub-loading"
        />
    );
}
