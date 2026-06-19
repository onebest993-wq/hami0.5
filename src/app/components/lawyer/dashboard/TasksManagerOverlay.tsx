import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { LazyTasksManager } from '@/app/utils/lazyComponents';
import { TASKS_MANAGER_FALLBACK } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

export type TasksManagerOverlayProps = {
    open: boolean;
    onClose: () => void;
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

/** Portal + Suspense on document.body — avoids z-index/stacking and layout collapse in the dashboard tree. */
export function TasksManagerOverlay({
    open,
    onClose,
    focusTaskId,
    lawsuitFiles = [],
    executionFiles = [],
}: TasksManagerOverlayProps) {
    useBodyScrollLock(open);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <Suspense fallback={TASKS_MANAGER_FALLBACK}>
            <LazyTasksManager
                onClose={onClose}
                focusTaskId={focusTaskId}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
            />
        </Suspense>,
        document.body,
    );
}
