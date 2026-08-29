import { sanitizeTrialSessionIsoDateInput } from '../trialSessionsEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';

type PresenceField = {
    label: string;
    options: Array<{ value: 'present' | 'absent'; label: string }>;
};
export type TrialsAddSessionModalProps = {
    isEditingPendingSession: boolean;
    addDate: string;
    setAddDate: (v: string) => void;
    addSessionNumber: string;
    setAddSessionNumber: (v: string) => void;
    addPresence: 'present' | 'absent';
    setAddPresence: (v: 'present' | 'absent') => void;
    addNotes: string;
    setAddNotes: (v: string) => void;
    presenceField: PresenceField;
    showPreparatoryInline: boolean;
    setShowPreparatoryInline: (v: boolean) => void;
    prepTitle: string;
    setPrepTitle: (v: string) => void;
    prepDetails: string;
    setPrepDetails: (v: string) => void;
    isBlockingSuit: boolean;
    setIsBlockingSuit: (v: boolean) => void;
    readOnly?: boolean;
    dossierConcluded: boolean;
    onClose: () => void;
    onPreparatoryToggle: () => void;
    onSubmitPreparatory: () => void;
    onPostpone: () => void;
    onFinalDecision: () => void;
};

export function TrialsAddSessionModal({
    isEditingPendingSession,
    addDate,
    setAddDate,
    addSessionNumber,
    setAddSessionNumber,
    addPresence,
    setAddPresence,
    addNotes,
    setAddNotes,
    presenceField,
    showPreparatoryInline,
    setShowPreparatoryInline,
    prepTitle,
    setPrepTitle,
    prepDetails,
    setPrepDetails,
    isBlockingSuit,
    setIsBlockingSuit,
    readOnly,
    dossierConcluded,
    onClose,
    onPreparatoryToggle,
    onSubmitPreparatory,
    onPostpone,
    onFinalDecision,
}: TrialsAddSessionModalProps) {
    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.trial}>
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg max-h-[90vh] flex flex-col">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <div className="text-white font-black text-sm">
                        {isEditingPendingSession ? 'جلسة المرافعة الحالية' : 'جلسة مرافعة جديدة'}
                    </div>
                    <button type="button" onClick={onClose} className="text-white/60 text-xs font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-white/60 text-xs mb-1">تاريخ الجلسة</label>
                            <input
                                type="date"
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white unicode-bidi-plaintext"
                                dir="ltr"
                                value={addDate}
                                onChange={(e) =>
                                    setAddDate(sanitizeTrialSessionIsoDateInput(e.target.value))
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs mb-1">رقم الجلسة</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white tabular-nums disabled:opacity-80 disabled:cursor-not-allowed"
                                value={addSessionNumber}
                                readOnly={!isEditingPendingSession}
                                onChange={(e) => setAddSessionNumber(e.target.value.replace(/\D/g, ''))}
                                title={
                                    isEditingPendingSession
                                        ? undefined
                                        : 'يُحسب تلقائياً حسب تسلسل الجلسات المسجّلة'
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-white/60 text-xs mb-1">{presenceField.label}</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                            value={addPresence}
                            onChange={(e) =>
                                setAddPresence(e.target.value === 'absent' ? 'absent' : 'present')
                            }
                        >
                            {presenceField.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {!showPreparatoryInline && !readOnly && !dossierConcluded ? (
                        <button
                            type="button"
                            onClick={onPreparatoryToggle}
                            className="w-full rounded-xl border border-violet-500/35 bg-violet-950/20 px-3 py-2 text-[11px] font-black text-violet-100 hover:bg-violet-950/35 transition text-right"
                        >
                            ⚖️ تسجيل قرار إعدادي (اختياري)
                        </button>
                    ) : null}
                    {showPreparatoryInline ? (
                        <div className="rounded-xl border border-violet-500/35 bg-violet-950/20 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-violet-100 text-[11px] font-black">
                                    قرار إعدادي — الجلسة رقم {addSessionNumber || '—'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPreparatoryInline(false)}
                                    className="text-[10px] font-bold text-white/45 hover:text-white/70"
                                >
                                    إخفاء
                                </button>
                            </div>
                            <div>
                                <label className="block text-white/60 text-xs mb-1">
                                    اسم القرار الإعدادي / الأمر
                                </label>
                                <input
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                                    value={prepTitle}
                                    onChange={(e) => setPrepTitle(e.target.value)}
                                    placeholder="مثال: تأجيل نظر الدعوى لطلب مستند"
                                />
                            </div>
                            <div
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 space-y-1.5"
                                role="group"
                                aria-label="هل القرار يترتب عليه منع أو وقف في سير الدعوى؟"
                            >
                                <span className="block text-[10px] font-bold text-white/75">
                                    هل القرار يترتب عليه منع أو وقف في سير الدعوى؟
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={isBlockingSuit}
                                        onClick={() => setIsBlockingSuit(true)}
                                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black transition ${
                                            isBlockingSuit
                                                ? 'border-[#E6C673]/55 bg-[#E6C673]/15 text-[#E6C673]'
                                                : 'border-white/15 bg-white/[0.04] text-white/60'
                                        }`}
                                    >
                                        نعم
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={!isBlockingSuit}
                                        onClick={() => setIsBlockingSuit(false)}
                                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black transition ${
                                            !isBlockingSuit
                                                ? 'border-slate-500/45 bg-slate-700/35 text-slate-200'
                                                : 'border-white/15 bg-white/[0.04] text-white/60'
                                        }`}
                                    >
                                        لا
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-white/60 text-xs mb-1">
                                    تفاصيل ووقائع القرار
                                </label>
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[72px] resize-none"
                                    value={prepDetails}
                                    onChange={(e) => setPrepDetails(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={onSubmitPreparatory}
                                    className="rounded-xl bg-violet-600/85 px-4 py-2 text-[11px] font-black text-white hover:bg-violet-600 transition"
                                >
                                    حفظ الجلسة وتوثيق القرار
                                </button>
                            </div>
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/60 text-xs mb-1">محضر المرافعة / ما جرى</label>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white min-h-[88px] resize-none"
                            value={addNotes}
                            onChange={(e) => setAddNotes(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onPostpone}
                            className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-950/35 transition"
                        >
                            تأجيل المحاكمة
                        </button>
                        <button
                            type="button"
                            onClick={onFinalDecision}
                            className="rounded-xl border border-[#d4af37]/55 bg-[#d4af37]/15 px-4 py-2 text-[11px] font-black text-[#d4af37] hover:bg-[#d4af37]/25 transition"
                        >
                            إصدار القرار الختامي
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
}
