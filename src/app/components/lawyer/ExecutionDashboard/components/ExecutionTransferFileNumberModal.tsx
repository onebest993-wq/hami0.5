import React, { useEffect, useState } from 'react';
import { X } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_SHELL_MAX,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';

export type ExecutionTransferFileNumberModalProps = {
    open: boolean;
    initialFileNumber: string;
    onClose: () => void;
    onConfirm: (fileNumber: string) => void;
    onValidationWarning: (message: string) => void;
};

export function ExecutionTransferFileNumberModal({
    open,
    initialFileNumber,
    onClose,
    onConfirm,
    onValidationWarning,
}: ExecutionTransferFileNumberModalProps) {
    const [draft, setDraft] = useState('');

    useEffect(() => {
        if (open) {
            setDraft(String(initialFileNumber || '').trim());
        }
    }, [open, initialFileNumber]);

    if (!open) return null;

    const handleConfirm = () => {
        const nextNo = String(draft || '').trim();
        if (!nextNo) {
            onValidationWarning('أدخل رقم الإضبارة الجديد');
            return;
        }
        onConfirm(nextNo);
    };

    return (
        <div
            className={`fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={`w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0A0F1C] shadow-2xl ${EXEC_MODAL_EDIT_SHELL_MAX}`}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                    <span className="text-[13px] font-bold text-amber-200">تغيير رقم الإضبارة</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="rounded-xl bg-amber-950/20 border border-amber-500/10 p-3">
                        <p className="text-[10px] text-amber-300/70 leading-relaxed">
                            بعد نقل الإضبارة وتغيير المديرية، يمكنك إدخال رقم الإضبارة الجديد هنا.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-400">
                            رقم الإضبارة الجديد
                        </label>
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="مثال: 1111"
                            className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/10 transition-colors ${EXEC_MODAL_TOUCH_TARGET}`}
                        >
                            لاحقاً
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className={`rounded-xl border border-amber-500/25 bg-amber-950/35 px-4 py-2 text-[11px] font-bold text-amber-200 hover:bg-amber-950/55 hover:border-amber-500/45 transition-colors ${EXEC_MODAL_TOUCH_TARGET}`}
                        >
                            تأكيد
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
