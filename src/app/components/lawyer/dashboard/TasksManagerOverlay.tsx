import React from 'react';
import { createPortal } from 'react-dom';
import { TasksManager } from '@/app/components/lawyer/dashboard/TasksManager';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

export type TasksManagerOverlayProps = {
    open: boolean;
    onClose: () => void;
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

function getOverlayPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
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
    const keyboardInsetPx = useMobileKeyboardInset();

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden"
            role="presentation"
            data-testid="tasks-manager-overlay"
        >
            <TasksManager
                onClose={onClose}
                focusTaskId={focusTaskId}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
                keyboardInsetPx={keyboardInsetPx}
            />
        </div>,
        getOverlayPortalRoot(),
    );
}
