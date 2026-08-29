import React from 'react';
import { createPortal } from 'react-dom';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';

interface FocModalPortalProps {
    open: boolean;
    onBackdropClick?: () => void;
    backdropClassName?: string;
    children: React.ReactNode;
}

const NOOP_CLOSE = () => undefined;

/** يعرض طبقة المودال على document.body فوق نافذة المركز المالي (z-180) */
export function FocModalPortal({
    open,
    onBackdropClick,
    backdropClassName = '',
    children,
}: FocModalPortalProps) {
    useExecutionOverlayDismiss(Boolean(open && onBackdropClick), onBackdropClick ?? NOOP_CLOSE);

    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${backdropClassName}`.trim()}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="presentation"
            onClick={onBackdropClick}
        >
            {children}
        </div>,
        document.body
    );
}
