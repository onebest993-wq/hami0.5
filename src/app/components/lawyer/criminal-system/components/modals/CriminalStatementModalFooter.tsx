export type CriminalStatementModalFooterProps = {
    onClose: () => void;
    requestSave: () => void;
    canSave: boolean;
};

export type CriminalStatementModalSaveConfirmProps = {
    saveConfirmOpen: boolean;
    setSaveConfirmOpen: (open: boolean) => void;
    submit: () => void;
};

export function CriminalStatementModalFooter({
    onClose,
    requestSave,
    canSave,
}: CriminalStatementModalFooterProps) {
    return (
        <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
            <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words touch-manipulation"
            >
                إلغاء
            </button>
            <button
                type="button"
                onClick={requestSave}
                disabled={!canSave}
                className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words touch-manipulation"
            >
                حفظ في السجل
            </button>
        </div>
    );
}

export function CriminalStatementModalSaveConfirm({
    saveConfirmOpen,
    setSaveConfirmOpen,
    submit,
}: CriminalStatementModalSaveConfirmProps) {
    if (!saveConfirmOpen) return null;

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-slate-900 p-4 space-y-3">
                <div className="text-amber-100 font-black text-sm whitespace-normal break-words">
                    تأكيد حفظ الإفادة
                </div>
                <p className="text-white/80 text-xs font-bold whitespace-normal break-words leading-relaxed">
                    تأكد من صحة الأسماء والبيانات — لا يمكن تعديل الإفادة بعد التسجيل.
                </p>
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setSaveConfirmOpen(false)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-white/80"
                    >
                        مراجعة
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        className="rounded-xl bg-[#E6C673] text-[#0B1021] px-3 py-2 text-xs font-black"
                    >
                        تأكيد الحفظ
                    </button>
                </div>
            </div>
        </div>
    );
}
