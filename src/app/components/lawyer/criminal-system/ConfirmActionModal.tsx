import React from 'react';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from './criminalModalPortal';
import {
    CRIMINAL_MODAL_BTN_CANCEL,
    CRIMINAL_MODAL_BTN_CLOSE_HEADER,
    CRIMINAL_MODAL_BTN_DANGER_CONFIRM,
} from './criminalModalButtonStyles';

export type ConfirmActionModalProps = {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    /** إطار تحذيري أحمر (وفاة، حذف حساس، إلخ). */
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export const ConfirmActionModal = ({
    open,
    title,
    message,
    confirmText = 'تأكيد الحذف',
    cancelText = 'إلغاء',
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmActionModalProps) => {
    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.nested} className="bg-black/62">
            <div
                className={`w-full max-w-sm rounded-2xl border bg-slate-900 overflow-hidden ${
                    danger ? 'border-red-500/60 shadow-lg shadow-red-950/40' : 'border-slate-700'
                }`}
            >
                <div
                    className={`p-4 border-b flex items-center justify-between gap-3 ${
                        danger ? 'border-red-500/40 bg-red-950/50' : 'border-slate-700 bg-slate-800/50'
                    }`}
                >
                    <div
                        className={`font-black text-sm whitespace-normal break-words ${
                            danger ? 'text-red-100' : 'text-white'
                        }`}
                    >
                        {title || 'تأكيد العملية'}
                    </div>
                    <button type="button" onClick={onCancel} className={CRIMINAL_MODAL_BTN_CLOSE_HEADER}>
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="text-white/80 text-sm font-bold whitespace-normal break-words leading-relaxed">
                        {message}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={onCancel} className={CRIMINAL_MODAL_BTN_CANCEL}>
                            {cancelText}
                        </button>
                        <button type="button" onClick={onConfirm} className={CRIMINAL_MODAL_BTN_DANGER_CONFIRM}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};

