import React, { Suspense, useEffect } from 'react';
import { X } from '@/app/components/ui/icons/X';
import type { DecisionsHubProps } from '@/app/components/lawyer/DecisionsHub';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET_WIDE,
    EXEC_OVERLAY_TITLE,
} from '../executionModalMobileShell';

export interface ExecutionDecisionsModalContainerProps extends DecisionsHubProps {
    showDecisionsModal: boolean;
    onCloseDecisionsModal: () => void;
    LazyDecisionsAndAppealsEngine: React.ComponentType<DecisionsHubProps>;
}

export const ExecutionDecisionsModalContainer: React.FC<
    ExecutionDecisionsModalContainerProps
> = ({
    showDecisionsModal,
    onCloseDecisionsModal,
    LazyDecisionsAndAppealsEngine,
    ...hubProps
}) => {
    useBodyScrollLock(showDecisionsModal);

    useEffect(() => {
        if (!showDecisionsModal) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseDecisionsModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [showDecisionsModal, onCloseDecisionsModal]);

    if (!showDecisionsModal) return null;

    return (
        <div
            className={`${EXEC_OVERLAY_PHONE_BACKDROP} overflow-hidden`}
            style={{ zIndex: EXEC_MODAL_Z.decisionsShell }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onCloseDecisionsModal();
                }
            }}
            role="presentation"
        >
            <div
                className={`${EXEC_OVERLAY_PHONE_SHEET_WIDE} sm:max-w-2xl`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={EXEC_OVERLAY_HEADER}>
                    <h3 className={EXEC_OVERLAY_TITLE}>مركز القرارات والطعون</h3>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseDecisionsModal();
                        }}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
                    <Suspense
                        fallback={
                            <div className="space-y-1.5 py-2" aria-busy="true" aria-hidden>
                                <div className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]" />
                                <div className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]" />
                                <div className="h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]" />
                            </div>
                        }
                    >
                        <LazyDecisionsAndAppealsEngine {...hubProps} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};
