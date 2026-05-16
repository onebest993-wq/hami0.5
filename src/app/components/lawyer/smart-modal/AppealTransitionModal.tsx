import React, { useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface AppealTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        appealType: string;
        appellant: string;
        filingDate: string;
        newCaseNumber: string;
        notes: string;
    }) => void;
    currentParties: Array<{ id: string; name: string; role?: string; isClient?: boolean }>;
    representedParty: string;
}

export const AppealTransitionModal: React.FC<AppealTransitionModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    currentParties,
    representedParty
}) => {
    const [appealType, setAppealType] = useState<string>('استئناف');
    const [appellant, setAppellant] = useState<string>('');
    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [newCaseNumber, setNewCaseNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    const handleSubmit = () => {
        if (!appellant) {
            SmartToast.error('⚠️ الرجاء اختيار مقدم الطعن (المستأنف)');
            return;
        }
        if (!newCaseNumber.trim()) {
            SmartToast.error('⚠️ الرجاء إدخال رقم دعوى الاستئناف/التمييز');
            return;
        }

        onConfirm({
            appealType,
            appellant,
            filingDate,
            newCaseNumber: newCaseNumber.trim(),
            notes
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-2xl bg-gradient-to-br from-[#1A1E2E] to-[#0F121E] rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 relative shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <ArrowRightLeft size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-white text-2xl font-bold">بوابة الطعن</h2>
                                        <p className="text-white/80 text-sm">الانتقال لمرحلة الاستئناف أو التمييز</p>
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 space-y-5 overflow-y-auto scrollbar-hide flex-1">
                            {/* Field 1: نوع الطعن */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-amber-400">⚖️</span>
                                    نوع الطعن
                                </label>
                                <div className="flex gap-3 w-full">
                                    <button type="button"
                                        onClick={() => setAppealType('استئناف')}
                                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                                            appealType === 'استئناف'
                                                ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                                                : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        الاستئناف
                                    </button>
                                    <button type="button"
                                        onClick={() => setAppealType('تمييز')}
                                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                                            appealType === 'تمييز'
                                                ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                                                : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        التمييز
                                    </button>
                                </div>
                            </div>

                            {/* Field 2: مقدم الطعن (المستأنف/المميز) */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-amber-400">👤</span>
                                    {appealType === 'تمييز' ? 'مقدم الطعن (المميز)' : 'مقدم الطعن (المستأنف)'}
                                </label>
                                <select
                                    value={appellant}
                                    onChange={(e) => setAppellant(e.target.value)}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition-all"
                                >
                                    <option value="">اختر الطرف الذي قدم الطعن...</option>
                                    <option value="المدعي">المدعي (الطرف الأول)</option>
                                    <option value="المدعى عليه">المدعى عليه (الطرف الثاني)</option>
                                </select>
                                <p className="text-xs text-white/40 mt-1">
                                    {appealType === 'تمييز' 
                                        ? '⚠️ سيتم انقلاب المراكز القانونية تلقائياً: المميز ↔ المميز عليه'
                                        : '⚠️ سيتم انقلاب المراكز القانونية تلقائياً: المستأنف ↔ المستأنف عليه'
                                    }
                                </p>
                            </div>

                            {/* Field 3: تاريخ تقديم اللائحة */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-amber-400">📅</span>
                                    تاريخ تقديم لائحة الطعن
                                </label>
                                <input
                                    type="date"
                                    value={filingDate}
                                    onChange={(e) => setFilingDate(e.target.value)}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition-all"
                                />
                            </div>

                            {/* Field 4: رقم دعوى الاستئناف/التمييز */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-amber-400">🔢</span>
                                    {appealType === 'تمييز' ? 'رقم دعوى التمييز' : 'رقم دعوى الاستئناف'}
                                </label>
                                <input
                                    type="text"
                                    value={newCaseNumber}
                                    onChange={(e) => setNewCaseNumber(e.target.value)}
                                    placeholder="مثال: 123/س/2026"
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none transition-all"
                                />
                            </div>

                            {/* Field 5: ملاحظات */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-amber-400">📝</span>
                                    ملاحظات إضافية
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition-all resize-none"
                                    placeholder="أضف أي ملاحظات خاصة بالطعن..."
                                />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-200">
                                    <p className="font-bold mb-1">ملاحظة هامة:</p>
                                    <p>عند الانتقال لمرحلة {appealType}، سيتم:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-300/90">
                                        <li>أرشفة المرحلة الحالية (البداءة) كملف فرعي مقفل</li>
                                        <li>إنشاء إضبارة جديدة نظيفة لمرحلة {appealType}</li>
                                        <li>انقلاب المراكز القانونية (من قدم الطعن يصبح مستأنف)</li>
                                        <li>مسح جميع بيانات بطاقة الدعوى - ستقوم بإضافتها من جديد</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 pt-0 shrink-0 border-t border-slate-700/50 bg-[#0F121E]">
                            <div className="flex gap-3 pt-4">
                                <button type="button"
                                    onClick={handleSubmit}
                                    className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Scale size={20} />
                                    تأكيد الانتقال لمرحلة {appealType}
                                </button>
                                <button type="button"
                                    onClick={onClose}
                                    className="px-6 py-4 bg-transparent hover:bg-white/5 text-white/60 hover:text-white rounded-xl font-bold transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
