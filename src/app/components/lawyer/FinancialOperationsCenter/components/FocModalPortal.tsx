import React from 'react';
import { createPortal } from 'react-dom';
import { useOverlayEscapeDismiss } from '@/app/hooks/useOverlayEscapeDismiss';
import {
    NESTED_MODAL_BACKDROP_STRONG,
    NESTED_OVER_FOLLOWUP_MODAL_Z,
} from '@/app/components/shared/nestedOverFollowUpModalChrome';

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
    useOverlayEscapeDismiss(Boolean(open && onBackdropClick), onBackdropClick ?? NOOP_CLOSE);

    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${NESTED_MODAL_BACKDROP_STRONG} ${backdropClassName}`.trim()}
            style={{ zIndex: NESTED_OVER_FOLLOWUP_MODAL_Z }}
            role="presentation"
            onClick={onBackdropClick}
        >
            {children}
        </div>,
        document.body,
    );
}
