import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { DecisionsHubProps } from '@/app/components/lawyer/DecisionsHub';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

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
    if (!showDecisionsModal) return null;

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950/55 p-0 backdrop-blur-2xl sm:p-2"
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
                className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-0 border-white/10 bg-slate-900/35 shadow-none backdrop-blur-2xl sm:rounded-2xl sm:border"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
                    <h3 className="text-lg font-bold text-slate-100 sm:text-xl">مركز القرارات والطعون</h3>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseDecisionsModal();
                        }}
                        className="rounded-lg border border-transparent p-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
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
