import type { LegalArticleChange } from '../criminalCaseModel';

export type LegalArticleEditModalProps = {
    open: boolean;
    legalArticleNext: string;
    setLegalArticleNext: (value: string) => void;
    legalChangedBy: LegalArticleChange['changedBy'];
    setLegalChangedBy: (value: LegalArticleChange['changedBy']) => void;
    onClose: () => void;
    onSubmit: () => void;
};

function isLegalChangedByValue(v: string): v is LegalArticleChange['changedBy'] {
    return v === 'police' || v === 'investigation_judge' || v === 'trial_court';
}

/** مودال تعديل الوصف القانوني للمادة */
export function LegalArticleEditModal({
    open,
    legalArticleNext,
    setLegalArticleNext,
    legalChangedBy,
    setLegalChangedBy,
    onClose,
    onSubmit,
}: LegalArticleEditModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[221] bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-article-edit-title"
        >
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div
                        id="legal-article-edit-title"
                        className="text-white font-black text-sm whitespace-normal break-words"
                    >
                        تعديل الوصف القانوني
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
                            المادة الجديدة
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                            value={legalArticleNext}
                            onChange={(e) => setLegalArticleNext(e.target.value)}
                            placeholder='مثال: "مادة 446 عقوبات"، "مادة 411/ أولاً"'
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            الجهة التي قررت التعديل
                        </label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[44px]"
                            value={legalChangedBy}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (isLegalChangedByValue(v)) setLegalChangedBy(v);
                            }}
                        >
                            <option value="police" className="bg-slate-900 text-white">
                                الشرطة
                            </option>
                            <option value="investigation_judge" className="bg-slate-900 text-white">
                                قاضي التحقيق
                            </option>
                            <option value="trial_court" className="bg-slate-900 text-white">
                                محكمة الموضوع
                            </option>
                        </select>
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
                            disabled={!legalArticleNext.trim()}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words min-h-[44px]"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
