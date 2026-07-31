export type BailForfeitureModalState = {
    defendantId: string;
    forfeitureNote: string;
};

export type BailForfeitureModalProps = {
    modal: BailForfeitureModalState | null;
    defendantName?: string;
    onChangeNote: (note: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

/** مودال تحديث مصادرة الكفالة */
export function BailForfeitureModal({
    modal,
    onChangeNote,
    onClose,
    onSubmit,
}: BailForfeitureModalProps) {
    if (!modal) return null;

    return (
        <div
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bail-forfeiture-title"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div
                        id="bail-forfeiture-title"
                        className="text-white font-black text-sm whitespace-normal break-words"
                    >
                        تحديث مصادرة الكفالة
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold min-h-[44px] min-w-[44px]"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="space-y-1">
                        <label className="block text-white/70 text-xs font-black whitespace-normal break-words">
                            بيانات الكفالة / ملاحظات المصادرة (نص حر)
                        </label>
                        <textarea
                            value={modal.forfeitureNote}
                            onChange={(e) => onChangeNote(e.target.value)}
                            className="w-full min-h-[120px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-black text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#E6C673]/40"
                            placeholder="مقدار الكفالة + معلومات الكفيل + أي ملاحظات مصادرة..."
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onSubmit}
                        className="w-full rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-3 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words min-h-[44px]"
                    >
                        حفظ التحديث وحقن الحدث
                    </button>
                </div>
            </div>
        </div>
    );
}
