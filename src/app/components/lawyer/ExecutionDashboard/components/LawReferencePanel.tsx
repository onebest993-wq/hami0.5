import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ExecutionLawReferencePanel } from '@/app/components/lawyer/execution/ExecutionLawReferencePanel';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_OVERLAY_HEADER,
    EXEC_OVERLAY_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

const LAW_REFERENCE_MODAL_KEY = 'showLawReferencePanel' as const;

export interface LawReferencePanelProps {
    isEvictionExecutionModule?: boolean;
    executionData?: Record<string, unknown> | null | undefined;
    viewExecutionData?: Record<string, unknown> | null | undefined;
}

export const LawReferencePanel: React.FC<LawReferencePanelProps> = ({
    isEvictionExecutionModule = false,
    executionData,
    viewExecutionData,
}) => {
    const isOpen = useExecutionDashboardStore((s) => s.modals.showLawReferencePanel);
    const closeModal = useExecutionDashboardStore((s) => s.closeModal);
    const executionTypeFromStore = useExecutionDashboardStore((s) => s.currentFile?.executionType);

    const resolvedExecutionData = executionData ?? viewExecutionData;
    const executionType = isEvictionExecutionModule
        ? 'تخلية'
        : String(
              resolvedExecutionData?.executionType ?? executionTypeFromStore ?? '',
          ).trim();

    const handleClose = useCallback(() => {
        closeModal(LAW_REFERENCE_MODAL_KEY);
    }, [closeModal]);

    useBodyScrollLock(isOpen);
    useExecutionOverlayDismiss(isOpen, handleClose);

    if (!isOpen || typeof document === 'undefined') return null;

    const z = EXEC_MODAL_Z.lawReferencePanel;

    return createPortal(
        <div
            role="presentation"
            className="fixed inset-0 flex flex-col bg-[#05060D]"
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
                <div className={EXEC_OVERLAY_HEADER}>
                    <div className="min-w-0 flex-1 text-right">
                        <h2 id="law-reference-title" className={EXEC_OVERLAY_TITLE}>
                            قانون التنفيذ العراقي رقم 45
                        </h2>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            مرجع تشريعي — تصنيف حسب الإجراء
                        </p>
                    </div>
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            handleClose();
                        }}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                        data-testid="execution-law-reference-close"
                    >
                        <X size={22} />
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <ExecutionLawReferencePanel executionType={executionType} />
                </div>
            </div>
        </div>,
        document.body,
    );
};
