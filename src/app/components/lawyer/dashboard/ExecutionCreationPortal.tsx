import React, { Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LazyExecutionCreationView, prefetchExecutionCreationView } from '@/app/utils/lazyComponents';
import { ExecutionCreationBootShell } from '@/app/components/lawyer/dashboard/ExecutionCreationBootShell';

type ExecutionCreationPortalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (file: Record<string, unknown>) => void;
};

/** نموذج إنشاء التنفيذ — portal إلى body فوق ArchivePortal (z-80) */
export function ExecutionCreationPortal({ isOpen, onClose, onSave }: ExecutionCreationPortalProps) {
    useEffect(() => {
        if (!isOpen) return;
        prefetchExecutionCreationView();
    }, [isOpen]);

    if (!isOpen) return null;

    const layer = (
        <Suspense fallback={<ExecutionCreationBootShell onClose={onClose} />}>
            <LazyExecutionCreationView isOpen={isOpen} onClose={onClose} onSave={onSave} />
        </Suspense>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
