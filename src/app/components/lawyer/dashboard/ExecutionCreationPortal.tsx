import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExecutionCreationBootShell } from '@/app/components/lawyer/dashboard/ExecutionCreationBootShell';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import { LazyExecutionCreationView } from '@/app/runtime/executionCreationViewLazy';
import type { ExecutionArchiveFile } from '@/app/types/common';

type ExecutionCreationPortalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (file: Record<string, unknown>) => void;
};

/** نموذج إنشاء التنفيذ — portal إلى body فوق ArchivePortal (z-80) */
export function ExecutionCreationPortal({ isOpen, onClose, onSave }: ExecutionCreationPortalProps) {
    useEffect(() => {
        if (!isOpen) return;
        void LazyExecutionCreationView.preload();
    }, [isOpen]);

    if (!isOpen) return null;

    const layer = (
        <PreloadableOverlayGate
            lazy={LazyExecutionCreationView}
            lazyProps={{
                isOpen,
                onClose,
                onSave: onSave as (fileData: ExecutionArchiveFile) => void,
            }}
            fallback={<ExecutionCreationBootShell onClose={onClose} />}
        />
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
