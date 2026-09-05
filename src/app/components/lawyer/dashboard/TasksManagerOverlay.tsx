import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TasksManager } from '@/app/components/lawyer/dashboard/TasksManager';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { getHamiOverlayPortalRoot, HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';
import { TASKS_CHROME } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { removeTasksManagerInstantChrome } from '@/app/runtime/tasksManagerInstantPaint';
import { inertProps } from '@/app/utils/inertProps';

export type TasksManagerOverlayProps = {
    open: boolean;
    onClose: () => void;
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    keepAlive?: boolean;
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
    keepAlive = false,
}: TasksManagerOverlayProps) {
    useBodyScrollLock(open);
    useOpaqueFeatureSurface(open, TASKS_CHROME);
    const keyboardInsetPx = useMobileKeyboardInset(open, true);

    const overlayRef = useRef<HTMLDivElement>(null);
    const onPaintReady = useCallback(() => {
        removeTasksManagerInstantChrome();
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        removeTasksManagerInstantChrome();
        const restoreHits = () => {
            const overlay = overlayRef.current;
            if (!overlay) return;
            if (overlay.getAttribute('data-open') !== 'true') return;
            overlay.style.setProperty('pointer-events', 'auto');
            overlay.removeAttribute('inert');
            /** لا تترك aria-hidden="false" — أزل السمة؛ React يعيد ضبطها من open */
            overlay.removeAttribute('aria-hidden');
        };
        restoreHits();
        const frame = window.requestAnimationFrame(restoreHits);
        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    if ((!open && !keepAlive) || typeof document === 'undefined') return null;

    const overlayStyle = {
        ...(keyboardInsetPx > 0 ? { paddingBottom: `${keyboardInsetPx}px` } : null),
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
    } as React.CSSProperties;

    return createPortal(
        <div
            ref={overlayRef}
            className={`${open ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden overscroll-none touch-manipulation bg-[#0A0F1C] ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            role="presentation"
            data-testid="tasks-manager-overlay"
            data-hami-overlay-safe="1"
            data-open={open ? 'true' : 'false'}
            data-keep-alive={keepAlive && !open ? '1' : undefined}
            aria-hidden={!open}
            style={overlayStyle}
            {...inertProps(!open)}
        >
            <TasksManager
                onClose={onClose}
                focusTaskId={open ? focusTaskId : undefined}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
                keyboardInsetPx={keyboardInsetPx}
                surfaceOpen={open}
                onPaintReady={onPaintReady}
            />
        </div>,
        getOverlayPortalRoot(),
    );
}
