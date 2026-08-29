import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { X } from '@/app/components/ui/icons/X';
import { HUB_DOSSIER_CONSULT_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';

type CaseFlowConfirmDialogProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function CaseFlowConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    danger = false,
    onConfirm,
    onCancel,
}: CaseFlowConfirmDialogProps) {
    const T = useSmartFileModalTheme();

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 ${HUB_DOSSIER_CONSULT_Z_CLASS} flex items-center justify-center bg-[#03050B]/88 p-4 font-['Tajawal'] pointer-events-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200`}
            dir="rtl"
            onClick={onCancel}
            data-testid={CIVIL_LAWSUIT_TEST_IDS.caseFlowConfirmDialog}
        >
            <div
                className={`${T.shellCard} w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300`}
                onClick={(event) => event.stopPropagation()}
                role="alertdialog"
                aria-labelledby="case-flow-confirm-title"
                aria-describedby="case-flow-confirm-message"
            >
                <div className={T.header}>
                    <h3 id="case-flow-confirm-title" className={T.headerTitle}>
                        <AlertTriangle
                            size={16}
                            className={danger ? 'text-rose-300 shrink-0' : T.headerIcon}
                            strokeWidth={1.75}
                        />
                        {title}
                    </h3>
                    <button type="button" onClick={onCancel} className={T.closeBtn} aria-label="إغلاق">
                        <X size={16} />
                    </button>
                </div>
                <div className={`${T.body} text-center`}>
                    <p id="case-flow-confirm-message" className="text-[13px] leading-relaxed text-white/85">
                        {message}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="min-h-[44px] py-2.5 rounded-xl font-bold text-sm border border-white/[0.12] bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/85 transition-colors touch-manipulation"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            className={
                                danger
                                    ? 'min-h-[44px] py-2.5 rounded-xl font-bold text-sm border border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/22 transition-colors touch-manipulation'
                                    : `${T.btn} min-h-[44px] py-2.5`
                            }
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
