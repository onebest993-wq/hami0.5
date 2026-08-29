import React from 'react';
import { createPortal } from 'react-dom';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';

/** فوق غلاف محضر المتابعة (280) — يمنع تسرّب النقرات للإجراءات خلف النافذة */
const PERSONAL_COERCIVE_PORTAL_Z = EXEC_MODAL_Z.nestedOverFollowUpPortal;

export function PersonalCoerciveFollowUpPortal(props: {
    open: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    dismissDisabled?: boolean;
}) {
    const { open, onDismiss, children, dismissDisabled = false } = props;
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 pointer-events-auto ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: PERSONAL_COERCIVE_PORTAL_Z }}
            role="presentation"
            onMouseDown={(e) => {
                if (dismissDisabled) return;
                if (e.target === e.currentTarget) onDismiss();
            }}
            onKeyDown={(e) => {
                if (dismissDisabled) return;
                if (e.key === 'Escape') onDismiss();
            }}
        >
            {children}
        </div>,
        document.body
    );
}
