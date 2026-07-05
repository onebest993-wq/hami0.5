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
    onConfirm,
}) => {
    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [selectedPartyIds, setSelectedPartyIds] = useState<Array<number | string>>(() =>
        pendingParties.map((p) => p.id).filter((id) => id != null) as Array<number | string>,
    );

    useEffect(() => {
        if (!isOpen) return;
        setSelectedPartyIds(
            pendingParties.map((p) => p.id).filter((id) => id != null) as Array<number | string>,
        );
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
            SmartToast.error('الرجاء تحديد تاريخ تقديم اللائحة المتقابلة');
            return;
        }

        if (pendingParties.length > 0 && selectedPartyIds.length === 0) {
            SmartToast.error('اختر طرفاً واحداً على الأقل للاستئناف المتقابل');
            return;
        }

        onConfirm({
            filingDate,
            receiptNumber: '',
            notes: '',
            crossAppealPartyIds: selectedPartyIds.length > 0 ? selectedPartyIds : undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen ? (
                <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(2,6,14,0.82)] backdrop-blur-md p-4 sm:p-6 font-['Tajawal']">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 18 }}
                        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#E6C673]/18 bg-[#08101C]/96 shadow-[0_26px_90px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/[0.05]"
                    >
                        <div className="border-b border-white/[0.06] bg-gradient-to-r from-[#0F1828] to-[#0A1220] px-5 py-4 sm:px-6 sm:py-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6C673]/22 bg-[#E6C673]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                        <RefreshCw size={22} className="text-[#E6C673]" />
                                    </div>
                                    <div>
                                        <h2 className="text-white text-xl sm:text-2xl font-bold">الاستئناف المتقابل</h2>
                                        <p className="text-white/55 text-sm">تقديم لائحة استئناف متقابلة</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/45 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-5 bg-gradient-to-b from-[#09111D] via-[#09111C] to-[#070D17]">
                            <div className="rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#101A2B] to-[#0A1220] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex items-start gap-3">
                                <AlertCircle size={20} className="text-[#E6C673] flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-white/78 leading-6">
                                    <p className="font-bold mb-1 text-white">ما هو الاستئناف المتقابل؟</p>
                                    <p className="text-white/62">
                                        هو حق المستأنف عليه في تقديم لائحة استئناف ضد نفس الحكم المستأنف، حتى لو انتهت المدة القانونية للطعن. يمنح هذا الحق توازناً قانونياً للطرفين.
                                    </p>
                                </div>
                            </div>

                            {pendingParties.length > 0 ? (
                                <div className="rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#101A2B] to-[#0A1220] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                    <label className="block text-white/80 font-bold mb-3 text-sm">
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
                                                    className={`w-full rounded-2xl border px-4 py-3 text-right text-sm font-bold transition-all ${
                                                        selected
                                                            ? 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#F3DA94] shadow-[0_10px_28px_rgba(230,198,115,0.08)]'
                                                            : 'border-white/[0.08] bg-[#0D1524] text-white/72 hover:border-[#E6C673]/20 hover:bg-[#111C2E]'
                                                    }`}
                                                >
                                                    {party.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            <div className="rounded-[22px] border border-white/[0.08] bg-gradient-to-br from-[#101A2B] to-[#0A1220] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2 text-sm">
                                    <span className="text-[#E6C673]">📅</span>
                                    تاريخ تقديم اللائحة المتقابلة
                                </label>
                                <input
                                    type="date"
                                    value={filingDate}
                                    onChange={(e) => setFilingDate(e.target.value)}
                                    className="w-full rounded-2xl border border-white/[0.1] bg-[#0C1524] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#E6C673]/55 focus:bg-[#101A2B] focus:ring-1 focus:ring-[#E6C673]/16"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="flex-1 py-3.5 rounded-2xl bg-[#E6C673] text-[#0B1021] text-sm sm:text-base font-extrabold shadow-[0_14px_34px_rgba(230,198,115,0.18)] hover:bg-[#d4b45f] transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={20} />
                                    تأكيد تقديم الاستئناف المتقابل
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.05] font-bold transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
};
