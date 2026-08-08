import React from 'react';
import { createPortal } from 'react-dom';
import { TasksManager } from '@/app/components/lawyer/dashboard/TasksManager';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { TASKS_CHROME } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';

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
    useOpaqueFeatureSurface(open, TASKS_CHROME);
    const keyboardInsetPx = useMobileKeyboardInset(open, true);

    if (!open || typeof document === 'undefined') return null;

    const overlayStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    return createPortal(
        <div
            className="pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0F1629]"
            role="presentation"
            data-testid="tasks-manager-overlay"
            style={overlayStyle}
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
