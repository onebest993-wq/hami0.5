export type ReopenCaseModalProps = {
    open: boolean;
    reopenCaseReason: string;
    setReopenCaseReason: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

/** مودال إعادة فتح الدعوى المغلقة */
export function ReopenCaseModal({
    open,
    reopenCaseReason,
    setReopenCaseReason,
    onClose,
    onSubmit,
}: ReopenCaseModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[221] bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reopen-case-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div
                        id="reopen-case-title"
                        className="text-white font-black text-sm whitespace-normal break-words"
                    >
                        إعادة فتح الدعوى
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words min-h-[44px] min-w-[44px]"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            سبب إعادة الفتح
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[130px] resize-none"
                            value={reopenCaseReason}
                            onChange={(e) => setReopenCaseReason(e.target.value)}
                            placeholder="اكتب سبب إعادة الفتح..."
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words min-h-[44px]"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!reopenCaseReason.trim()}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words min-h-[44px]"
                        >
                            إعادة فتح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
