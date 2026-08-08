import React from 'react';
import { X } from '@/app/components/ui/lucideIcons';

interface ConfirmAttendanceModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmAttendanceModal({ isOpen, onConfirm, onCancel }: ConfirmAttendanceModalProps) {
    if (!isOpen) return null;
    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onCancel}
            role="presentation"
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-amber-500/35 bg-[#0B1120]/95 p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex flex-row-reverse items-start justify-between gap-3">
                    <div className="min-w-0 text-right">
                        <p className="text-amber-200 text-sm font-black">تحذير للتأكيد</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                            سيتم تسجيل حضور المدين دون تبليغ، وإغلاق واجهة مذكرة الإخبار لهذا المدين نهائياً.
                            هذا الإجراء لا يمكن الرجوع عنه.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="w-full rounded-xl border border-amber-500/45 bg-amber-950/35 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-950/45"
                    >
                        تأكيد — تسجيل حضور دون تبليغ
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-[12px] font-bold text-slate-200 hover:bg-white/10"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmAttendanceModal;
