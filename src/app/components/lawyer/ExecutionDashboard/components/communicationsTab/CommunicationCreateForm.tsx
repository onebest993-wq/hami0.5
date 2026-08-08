import { Plus, Send } from '@/app/components/ui/lucideIcons';

export type CommunicationCreateFormProps = {
    targetDirectorate: string;
    setTargetDirectorate: (value: string) => void;
    letterDate: string;
    setLetterDate: (value: string) => void;
    communicationDetails: string;
    setCommunicationDetails: (value: string) => void;
    creating: boolean;
    onCreate: () => void;
};

export function CommunicationCreateForm({
    targetDirectorate,
    setTargetDirectorate,
    letterDate,
    setLetterDate,
    communicationDetails,
    setCommunicationDetails,
    creating,
    onCreate,
}: CommunicationCreateFormProps) {
    return (
        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/15 p-4 space-y-3">
            <div className="flex flex-row-reverse items-center gap-2 border-b border-indigo-500/15 pb-2">
                <Send size={16} className="text-indigo-400 shrink-0" />
                <h4 className="text-[11px] font-bold text-indigo-200">إرسال كتاب / مخاطبة جهة</h4>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-[9px] font-bold text-slate-400">
                        إلى الجهة المُخاطبة *
                    </label>
                    <input
                        type="text"
                        value={targetDirectorate}
                        onChange={(e) => setTargetDirectorate(e.target.value)}
                        placeholder="اسم الدائرة أو الجهة..."
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[9px] font-bold text-slate-400">تاريخ الكتاب</label>
                    <input
                        type="date"
                        value={letterDate}
                        onChange={(e) => setLetterDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        dir="rtl"
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white focus:outline-none focus:border-indigo-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>
            </div>

            <div>
                <label className="mb-1 block text-[9px] font-bold text-slate-400">تفاصيل المخاطبة *</label>
                <textarea
                    value={communicationDetails}
                    onChange={(e) => setCommunicationDetails(e.target.value)}
                    rows={4}
                    placeholder="مضمون الكتاب، المطلوب من الجهة، أو أي تفاصيل تُسجَّل في السجل..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                />
            </div>

            <button
                type="button"
                onClick={onCreate}
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/80 py-3 text-[11px] font-bold text-white transition-all hover:bg-indigo-600 disabled:opacity-50"
            >
                {creating ? (
                    'جاري الإنشاء...'
                ) : (
                    <>
                        <Plus size={16} />
                        إنشاء الطلب
                    </>
                )}
            </button>
        </div>
    );
}
