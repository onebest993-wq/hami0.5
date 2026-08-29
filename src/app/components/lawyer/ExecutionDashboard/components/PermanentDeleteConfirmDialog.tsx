import React from 'react';

export interface PermanentDeleteConfirmDialogProps {
    permanentDeleteTimelineId: string | null;
    setPermanentDeleteTimelineId: (v: string | null) => void;
    permanentlyDeleteTimelineEvent: (timelineId: string) => void;
}

export const PermanentDeleteConfirmDialog: React.FC<PermanentDeleteConfirmDialogProps> = ({
    permanentDeleteTimelineId,
    setPermanentDeleteTimelineId,
    permanentlyDeleteTimelineEvent,
}) => {
    if (!permanentDeleteTimelineId) return null;

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4"
            dir="rtl"
            onClick={() => setPermanentDeleteTimelineId(null)}
            role="presentation"
        >
            <div
                className="w-full max-w-sm rounded-xl border border-rose-500/40 bg-[#0A0F1C] p-4 text-right shadow-lg"
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
            >
                <p className="text-sm font-bold text-white">تأكيد الحذف النهائي</p>
                <p className="mt-2 text-[11px] leading-relaxed text-rose-200/90">
                    سيتم إزالة هذا السجل من الإضبارة نهائياً ولا يمكن استرجاعه. هل أنت متأكد؟
                </p>
                <div className="mt-4 flex flex-row-reverse flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setPermanentDeleteTimelineId(null)}
                        className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (permanentDeleteTimelineId) {
                                permanentlyDeleteTimelineEvent(permanentDeleteTimelineId);
                            }
                        }}
                        className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-600"
                    >
                        حذف نهائياً
                    </button>
                </div>
            </div>
        </div>
    );
};
