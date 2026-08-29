import React from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { X } from '@/app/components/ui/icons/X';
import { createPortal } from 'react-dom';
import { personalPearlModalTheme } from './personalStatusPearlTheme';

type PersonalStatusFlowConfirmProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function PersonalStatusFlowConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    danger = false,
    onConfirm,
    onCancel,
}: PersonalStatusFlowConfirmProps) {
    const P = personalPearlModalTheme();

    if (!isOpen) return null;

    return createPortal(
        <div className={P.overlay} dir="rtl" onClick={onCancel}>
            <div className={`${P.shell} w-full max-w-sm`} onClick={(e) => e.stopPropagation()}>
                <div className={P.shellCard}>
                    <div className={P.header}>
                        <h3 className={P.headerTitle}>
                            <AlertTriangle
                                size={16}
                                className={danger ? 'text-rose-300 shrink-0' : P.headerIcon}
                                strokeWidth={1.75}
                            />
                            {title}
                        </h3>
                        <button type="button" onClick={onCancel} className={P.closeBtn} aria-label="إغلاق">
                            <X size={16} />
                        </button>
                    </div>
                    <div className={`${P.body} text-center`}>
                        <p className="text-[13px] leading-relaxed text-[#ECE8E2]/90">{message}</p>
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="py-2.5 rounded-xl font-bold text-sm border border-white/[0.14] bg-white/[0.05] text-[#9894A0] hover:bg-white/[0.08] hover:text-[#ECE8E2] transition-all"
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
                                        ? 'py-2.5 rounded-xl font-bold text-sm border border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/22 transition-all'
                                        : P.btn
                                }
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
