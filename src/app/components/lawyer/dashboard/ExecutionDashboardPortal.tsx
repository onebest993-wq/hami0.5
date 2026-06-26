import React, { Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    LazyExecutionDashboard,
    prefetchExecutionDashboard,
} from '@/app/utils/lazyComponents';
import { ExecutionDashboardBootChrome } from '@/app/components/lawyer/dashboard/ExecutionDashboardBootChrome';

type ExecutionDashboardPortalProps = {
    file: FileData;
    onClose: () => void;
    onUpdate: (file: FileData) => void;
};

/** إضبارة التنفيذ — غلاف مطابق لإطار الهاتف ثم lazy chunk */
export function ExecutionDashboardPortal({ file, onClose, onUpdate }: ExecutionDashboardPortalProps) {
    useEffect(() => {
        prefetchExecutionDashboard('urgent');
    }, [file.id]);

    const layer = (
        <Suspense
            fallback={<ExecutionDashboardBootChrome file={file} onClose={onClose} />}
        >
            <LazyExecutionDashboard
                key={`exec-${file.id}`}
                file={file}
                onClose={onClose}
                onUpdate={onUpdate}
            />
        </Suspense>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
