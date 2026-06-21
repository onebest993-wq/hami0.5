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

function getOverlayPortalRoot(): HTMLElement {
    if (typeof document === 'undefined') return null as unknown as HTMLElement;
    let root = document.getElementById('hami-overlay-portal');
    if (!root) {
        root = document.createElement('div');
        root.id = 'hami-overlay-portal';
        root.setAttribute('aria-hidden', 'true');
        Object.assign(root.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100dvh',
            pointerEvents: 'none',
            zIndex: '229',
        });
        document.body.appendChild(root);
    }
    return root;
}

/** Portal على طبقة مستقلة — تغطية كاملة دون تقسيم الشاشة مع #root */
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
        <div
            className="pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden"
            role="presentation"
        >
            <Suspense fallback={TASKS_MANAGER_FALLBACK}>
                <LazyTasksManager
                    onClose={onClose}
                    focusTaskId={focusTaskId}
                    lawsuitFiles={lawsuitFiles}
                    executionFiles={executionFiles}
                />
            </Suspense>
        </div>,
        getOverlayPortalRoot(),
    );
}
