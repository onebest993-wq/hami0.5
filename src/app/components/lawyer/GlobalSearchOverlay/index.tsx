import React from 'react';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchErrorBoundary } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchErrorBoundary';
import { GlobalSearchRuntimeProvider } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/GlobalSearchRuntimeProvider';
import { useGlobalSearchOverlayShell } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayShell';
import { GlobalSearchOverlayStaticShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell';

export type { GlobalSearchOverlayProps, GlobalSearchNavigate } from '@/app/components/lawyer/GlobalSearchOverlay/types';

function GlobalSearchOverlayInner(props: GlobalSearchOverlayProps) {
    const { mounted, shellProps } = useGlobalSearchOverlayShell(props);
    const { headless = false } = props;

    /*
     * StaticShell دائماً — فتح = visibility/تركيب بلا Motion spring
     * (يمنع وميض الخلفية/اللوحة عند أول فتح بارد).
     */
    if (!mounted || headless) {
        return null;
    }

    return <GlobalSearchOverlayStaticShell {...shellProps} />;
}

export function GlobalSearchOverlay(props: GlobalSearchOverlayProps) {
    const {
        open = true,
        files,
        executionFiles,
        lawsuitLifecycleIndex,
        globalNotes,
        notifications,
        criminalCases,
        userId,
        indexVersion,
        onClose,
    } = props;

    return (
        <GlobalSearchRuntimeProvider
            overlayOpen={open}
            files={files}
            executionFiles={executionFiles}
            lawsuitLifecycleIndex={lawsuitLifecycleIndex}
            globalNotes={globalNotes}
            notifications={notifications}
            criminalCases={criminalCases}
            userId={userId}
            indexVersion={indexVersion}
        >
            <GlobalSearchErrorBoundary onClose={onClose}>
                <GlobalSearchOverlayInner {...props} />
            </GlobalSearchErrorBoundary>
        </GlobalSearchRuntimeProvider>
    );
}
