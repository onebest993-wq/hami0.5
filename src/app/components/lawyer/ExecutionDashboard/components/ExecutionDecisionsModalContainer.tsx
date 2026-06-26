import React, { Suspense, useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { DecisionsHubProps } from '@/app/components/lawyer/DecisionsHub';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
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
            className={`fixed inset-0 flex flex-col overflow-hidden bg-slate-950/55 p-0 backdrop-blur-2xl sm:p-2 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: EXEC_MODAL_Z.decisionsShell }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onCloseDecisionsModal();
                }
            }}
            role="presentation"
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-0 w-full max-h-[min(100dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] flex-1 flex-col overflow-hidden border-0 border-white/10 bg-slate-900/35 shadow-none backdrop-blur-2xl sm:max-h-none sm:rounded-2xl sm:border"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <h3 className="text-lg font-bold text-slate-100 sm:text-xl">مركز القرارات والطعون</h3>
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
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                    <Suspense
                        fallback={
                            <div className="text-slate-200 text-sm py-8 text-center">جاري التحميل…</div>
                        }
                    >
                        <LazyDecisionsAndAppealsEngine {...hubProps} />
                    </Suspense>
                </div>
            </motion.div>
        </div>
    );
};
