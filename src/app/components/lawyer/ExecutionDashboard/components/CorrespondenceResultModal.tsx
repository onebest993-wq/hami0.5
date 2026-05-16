import React, { useState, useEffect } from 'react';
import { X, FileText, Save } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';

interface CorrespondenceResultModalProps {
    open: boolean;
    decision: Decision | null;
    readOnly: boolean;
    onSave: (decisionId: string, data: {
        purpose: string;
        letterNum: string;
        letterDate: string;
        result: string;
    }) => void;
    onClose: () => void;
    saving?: boolean;
}

export const CorrespondenceResultModal: React.FC<CorrespondenceResultModalProps> = ({
    open,
    decision,
    readOnly,
    onSave,
    onClose,
    saving,
}) => {
    const [purpose, setPurpose] = useState('');
    const [letterNum, setLetterNum] = useState('');
    const [letterDate, setLetterDate] = useState(getLocalTodayYmd());
    const [result, setResult] = useState('');

    useEffect(() => {
        if (decision) {
            setPurpose(decision.deputationTargetDirectorate || '');
            setLetterNum('');
            setLetterDate(getLocalTodayYmd());
            setResult(decision.deputationResultDetails || '');
        }
    }, [decision]);

    if (!open || !decision) return null;

    const handleSave = () => {
        onSave(decision.id, { purpose, letterNum, letterDate, result });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0A0F1C] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-amber-400" />
                        <span className="text-[13px] font-bold text-slate-100">
                            {readOnly ? 'تفاصيل المخاطبة' : 'تسجيل تفاصيل المخاطبة'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 text-right" dir="rtl">
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-400">الجهة المُخاطبة</label>
                        <input
                            type="text"
                            value={decision.title}
                            readOnly
                            className="w-full bg-black/40 border border-white/5 text-slate-300 rounded-xl p-3 text-[12px] cursor-default"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-400">مضمون الكتاب / الغاية منه</label>
                        <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="أدخل مضمون الكتاب..."
                            rows={3}
                            readOnly={readOnly}
                            className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none read-only:cursor-default read-only:opacity-70"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold text-slate-400">رقم الكتاب الصادر</label>
                            <input
                                type="text"
                                value={letterNum}
                                onChange={(e) => setLetterNum(e.target.value)}
                                placeholder="مثال: 45/2026"
                                readOnly={readOnly}
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 read-only:cursor-default read-only:opacity-70"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold text-slate-400">تاريخه</label>
                            <input
                                type="date"
                                value={letterDate}
                                onChange={(e) => setLetterDate(e.target.value)}
                                readOnly={readOnly}
                                className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 read-only:cursor-default read-only:opacity-70 [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold text-slate-400">تفاصيل النتيجة الواردة</label>
                        <textarea
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            placeholder="اكتب تفاصيل ما ورد من الجهة..."
                            rows={3}
                            readOnly={readOnly}
                            className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none read-only:cursor-default read-only:opacity-70"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-white/10 px-5 py-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-white/5 transition-colors"
                    >
                        {readOnly ? 'إغلاق' : 'إلغاء'}
                    </button>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !result.trim()}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600/80 py-2.5 text-[11px] font-bold text-white border border-amber-500/30 hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            <Save size={14} />
                            {saving ? 'جاري الحفظ...' : 'حفظ النتيجة الواردة'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
