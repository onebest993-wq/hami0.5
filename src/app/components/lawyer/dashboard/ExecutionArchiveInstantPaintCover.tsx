import React from 'react';
import { ExecutionArchiveInstantFrame } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantFrame';

/**
 * غطاء Suspense على OverlayHosts — نفس هندسة InstantChrome+InstantBody
 * إذا InstantChrome لم يُقيَّم بعد. بلا محمّل أرشيف ولا Toolbar التفاعلي.
 */
export function ExecutionArchiveInstantPaintCover({
    onClose,
    onAddNew,
}: {
    onClose: () => void;
    onAddNew?: () => void;
}): React.ReactElement {
    return (
        <ExecutionArchiveInstantFrame
            includeHeader
            onClose={onClose}
            onAddAction={onAddNew}
        />
    );
}
