import React, { useEffect } from 'react';
import { ExecutionArchiveInstantFrame } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantFrame';
import { prefetchExecutionArchiveContent } from '@/app/runtime/hubArchiveLoader';

/**
 * انتظار Surface داخل InstantChrome — توأم الإطار عبر InstantFrame.
 */
export function ExecutionArchiveInstantBody({
    onAddAction,
}: {
    onAddAction?: () => void;
}): React.ReactElement {
    useEffect(() => {
        prefetchExecutionArchiveContent();
        void import(
            '@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface'
        ).catch(() => undefined);
    }, []);

    return <ExecutionArchiveInstantFrame onAddAction={onAddAction} />;
}
