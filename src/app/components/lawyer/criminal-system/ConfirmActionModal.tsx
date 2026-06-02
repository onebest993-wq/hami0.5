import React from 'react';

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
        <div className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
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
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="text-white/80 text-sm font-bold whitespace-normal break-words leading-relaxed">
                        {message}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-black text-red-200 hover:bg-red-500/20 hover:text-red-100 transition whitespace-normal break-words"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

