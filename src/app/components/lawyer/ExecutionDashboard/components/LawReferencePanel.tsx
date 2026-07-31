import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ExecutionLawReferencePanel } from '@/app/components/lawyer/execution/ExecutionLawReferencePanel';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

const LAW_REFERENCE_MODAL_KEY = 'showLawReferencePanel' as const;

export interface LawReferencePanelProps {
    /** @deprecated الحالة من Zustand — يُتجاهل */
    isLawReferenceOpen?: boolean;
    /** @deprecated استخدم closeModal في المتجر */
    setIsLawReferenceOpen?: (v: boolean) => void;
    EXEC_MODAL_Z?: Record<string, number>;
    isEvictionExecutionModule?: boolean;
    executionData?: Record<string, unknown> | null | undefined;
    viewExecutionData?: Record<string, unknown> | null | undefined;
}

export const LawReferencePanel: React.FC<LawReferencePanelProps> = ({
    isEvictionExecutionModule = false,
    executionData,
    viewExecutionData,
    EXEC_MODAL_Z: execModalZProp,
}) => {
    const isOpen = useExecutionDashboardStore((s) => s.modals.showLawReferencePanel);
    const closeModal = useExecutionDashboardStore((s) => s.closeModal);
    const executionTypeFromStore = useExecutionDashboardStore((s) => s.currentFile?.executionType);
    const [articlesReady, setArticlesReady] = useState(false);

    const resolvedExecutionData = executionData ?? viewExecutionData;
    const executionType = isEvictionExecutionModule
        ? 'تخلية'
        : String(
              resolvedExecutionData?.executionType ?? executionTypeFromStore ?? '',
          ).trim();

    const handleClose = useCallback(() => {
        setArticlesReady(false);
        closeModal(LAW_REFERENCE_MODAL_KEY);
    }, [closeModal]);

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) {
            setArticlesReady(false);
            return;
        }
        const frameId = requestAnimationFrame(() => setArticlesReady(true));
        return () => cancelAnimationFrame(frameId);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, handleClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    const z = execModalZProp?.lawReferencePanel ?? EXEC_MODAL_Z.lawReferencePanel ?? 100;

    return createPortal(
        <div
            role="presentation"
            className="fixed inset-0 flex flex-col bg-[#05060D]/82 backdrop-blur-md"
            style={{ zIndex: z }}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="law-reference-title"
                className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0A0F1C] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
                data-testid="execution-law-reference-panel"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3.5">
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handleClose();
                        }}
                        className="touch-manipulation rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="إغلاق"
                        data-testid="execution-law-reference-close"
                    >
                        <X size={22} />
                    </button>
                    <div className="min-w-0 flex-1 text-center">
                        <h2
                            id="law-reference-title"
                            className="truncate text-base font-bold text-slate-100 sm:text-lg"
                        >
                            قانون التنفيذ العراقي رقم 45
                        </h2>
                        <p className="mt-0.5 text-[10px] text-white/40">مرجع تشريعي — تصنيف حسب الإجراء</p>
                    </div>
                    <span className="w-10 shrink-0" aria-hidden />
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {articlesReady ? (
                        <ExecutionLawReferencePanel executionType={executionType} />
                    ) : (
                        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
                            <p className="text-sm text-slate-500">جاري تجهيز المرجع القانوني…</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};
