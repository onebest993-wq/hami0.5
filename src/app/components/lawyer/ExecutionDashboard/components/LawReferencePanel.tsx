import React, { Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface LawReferencePanelProps {
    isLawReferenceOpen: boolean;
    setIsLawReferenceOpen: (v: boolean) => void;
    EXEC_MODAL_Z: Record<string, number>;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    ExecutionLawReferencePanel: React.LazyExoticComponent<React.ComponentType<any>>;
    isEvictionExecutionModule: boolean;
    executionData: Record<string, any> | null | undefined;
}

const LawReferenceOverlay: React.FC<Omit<LawReferencePanelProps, 'isLawReferenceOpen'>> = ({
    setIsLawReferenceOpen,
    EXEC_MODAL_Z,
    EXEC_OVERLAY_LAZY_FALLBACK,
    ExecutionLawReferencePanel,
    isEvictionExecutionModule,
    executionData,
}) => {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLawReferenceOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [setIsLawReferenceOpen]);

    return (
        <>
            <motion.div
                key="law-ref-backdrop"
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md sm:p-6"
                style={{ zIndex: EXEC_MODAL_Z.lawReferencePanel }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) setIsLawReferenceOpen(false);
                }}
            />
            <motion.div
                key="law-ref-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="law-reference-title"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-y-0 right-0 flex min-h-0 w-full max-w-2xl flex-col border-l border-slate-700/50 bg-[#0A0F1C] shadow-2xl"
                style={{ zIndex: EXEC_MODAL_Z.lawReferencePanel + 1 }}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-4">
                    <button
                        type="button"
                        onClick={() => setIsLawReferenceOpen(false)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                    <h2
                        id="law-reference-title"
                        className="flex-1 text-center text-base font-bold text-slate-100 sm:text-lg"
                    >
                        قانون التنفيذ العراقي رقم 45 لسنة 1980
                    </h2>
                    <span className="w-10 shrink-0" aria-hidden />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <ExecutionLawReferencePanel
                            executionType={isEvictionExecutionModule ? 'تخلية' : executionData?.executionType}
                        />
                    </Suspense>
                </div>
            </motion.div>
        </>
    );
};

export const LawReferencePanel: React.FC<LawReferencePanelProps> = ({
    isLawReferenceOpen,
    setIsLawReferenceOpen,
    EXEC_MODAL_Z,
    EXEC_OVERLAY_LAZY_FALLBACK,
    ExecutionLawReferencePanel,
    isEvictionExecutionModule,
    executionData,
}) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isLawReferenceOpen ? (
                <LawReferenceOverlay
                    setIsLawReferenceOpen={setIsLawReferenceOpen}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                    ExecutionLawReferencePanel={ExecutionLawReferencePanel}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    executionData={executionData}
                />
            ) : null}
        </AnimatePresence>,
        document.body,
    );
};
