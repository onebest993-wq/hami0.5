import React, { useEffect, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface CrossAppealModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingParties?: Array<{ id: number | string; name: string; role?: string }>;
    onConfirm: (data: {
        filingDate: string;
        receiptNumber: string;
        notes: string;
        crossAppealPartyIds?: Array<number | string>;
    }) => void;
}

export const CrossAppealModal: React.FC<CrossAppealModalProps> = ({ 
    isOpen, 
    onClose,
    pendingParties = [],
    onConfirm
}) => {
    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [receiptNumber, setReceiptNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [selectedPartyIds, setSelectedPartyIds] = useState<Array<number | string>>(() =>
        pendingParties.map((p) => p.id).filter((id) => id != null) as Array<number | string>,
    );

    useEffect(() => {
        if (isOpen) {
            setSelectedPartyIds(
                pendingParties.map((p) => p.id).filter((id) => id != null) as Array<number | string>,
            );
        }
    }, [isOpen, pendingParties]);

    const toggleParty = (id: number | string) => {
        setSelectedPartyIds((prev) => {
            const key = String(id);
            const exists = prev.some((p) => String(p) === key);
            if (exists) return prev.filter((p) => String(p) !== key);
            return [...prev, id];
        });
    };

    const handleSubmit = () => {
        if (!filingDate) {
            SmartToast.error('⚠️ الرجاء تحديد تاريخ تقديم اللائحة المتقابلة');
            return;
        }
        if (pendingParties.length > 0 && selectedPartyIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل للاستئناف المتقابل');
            return;
        }

        onConfirm({
            filingDate,
            receiptNumber: receiptNumber.trim(),
            notes,
            crossAppealPartyIds: selectedPartyIds.length > 0 ? selectedPartyIds : undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-lg bg-gradient-to-br from-[#1A1E2E] to-[#0F121E] rounded-2xl border border-teal-500/30 shadow-2xl shadow-teal-500/10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <RefreshCw size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-white text-2xl font-bold">الاستئناف المتقابل</h2>
                                        <p className="text-white/80 text-sm">تقديم لائحة استئناف متقابلة</p>
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

                        {/* Form */}
                        <div className="p-6 space-y-5">
                            {/* Info Box */}
                            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-teal-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-teal-200">
                                    <p className="font-bold mb-1">ما هو الاستئناف المتقابل؟</p>
                                    <p className="text-teal-300/90">
                                        هو حق المستأنف عليه في تقديم لائحة استئناف ضد نفس الحكم المستأنف، حتى لو انتهت المدة القانونية للطعن. يمنح هذا الحق توازناً قانونياً للطرفين.
                                    </p>
                                </div>
                            </div>

                            {pendingParties.length > 0 ? (
                                <div>
                                    <label className="block text-white/80 font-bold mb-2 text-sm">
                                        الطرف المستأنف متقابلاً
                                    </label>
                                    <div className="space-y-2">
                                        {pendingParties.map((party) => {
                                            const selected = selectedPartyIds.some(
                                                (id) => String(id) === String(party.id),
                                            );
                                            return (
                                                <button
                                                    key={String(party.id)}
                                                    type="button"
                                                    onClick={() => toggleParty(party.id)}
                                                    className={`w-full rounded-xl border px-3 py-2.5 text-right text-sm transition-all ${
                                                        selected
                                                            ? 'border-teal-400/40 bg-teal-500/10 text-teal-100'
                                                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20'
                                                    }`}
                                                >
                                                    {party.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {/* Field 1: تاريخ تقديم اللائحة المتقابلة */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-teal-400">📅</span>
                                    تاريخ تقديم اللائحة المتقابلة
                                </label>
                                <input
                                    type="date"
                                    value={filingDate}
                                    onChange={(e) => setFilingDate(e.target.value)}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-500 focus:outline-none transition-all"
                                />
                            </div>

                            {/* Field 2: رقم وصل الرسوم */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-teal-400">🧾</span>
                                    رقم وصل الرسوم
                                    <span className="text-xs text-white/40">(اختياري)</span>
                                </label>
                                <input
                                    type="text"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                    placeholder="مثال: 456789"
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-teal-500 focus:outline-none transition-all"
                                />
                            </div>

                            {/* Field 3: ملاحظات */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-teal-400">📝</span>
                                    ملاحظات إضافية
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-500 focus:outline-none transition-all resize-none"
                                    placeholder="أضف أي ملاحظات خاصة بالاستئناف المتقابل..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                                <button type="button"
                                    onClick={handleSubmit}
                                    className="flex-1 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={20} />
                                    تأكيد تقديم الاستئناف المتقابل
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
