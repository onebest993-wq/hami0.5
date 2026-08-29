import React, { useEffect, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { X } from '@/app/components/ui/icons/X';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { HUB_TOPMOST_OVERLAY_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';

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
        <div
            className={`fixed inset-0 ${HUB_TOPMOST_OVERLAY_Z_CLASS} flex items-center justify-center bg-[#02060E]/92 p-4 sm:p-6 font-['Tajawal']`}
        >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E6C673]/16 bg-[#0C1220] shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
                <div className="border-b border-white/[0.06] bg-[#0F1828] px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="text-lg sm:text-xl font-extrabold text-[#E6C673] truncate">
                                تقديم استئناف متقابل
                            </h3>
                            <p className="text-[11px] text-white/40 mt-0.5">تسجيل لائحة الاستئناف المتقابل</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                            aria-label="إغلاق"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {pendingParties.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-white/50">الأطراف المستأنفون متقابلاً</p>
                            <div className="space-y-2">
                                {pendingParties.map((party) => {
                                    const checked = selectedPartyIds.some((id) => String(id) === String(party.id));
                                    return (
                                        <label
                                            key={String(party.id)}
                                            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                                                checked
                                                    ? 'border-[#E6C673]/35 bg-[#E6C673]/10'
                                                    : 'border-white/[0.08] bg-white/[0.03]'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleParty(party.id)}
                                                className="accent-[#E6C673]"
                                            />
                                            <span className="text-sm text-white/90">{party.name}</span>
                                            {party.role ? (
                                                <span className="text-[10px] text-white/40 mr-auto">{party.role}</span>
                                            ) : null}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100/90">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p>لا توجد أطراف معلّقة — يمكن المتابعة بتاريخ التقديم فقط.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-white/50 mb-1.5">
                            تاريخ تقديم اللائحة المتقابلة
                        </label>
                        <input
                            type="date"
                            value={filingDate}
                            onChange={(e) => setFilingDate(e.target.value)}
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#E6C673]/30 [color-scheme:dark]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 py-3.5 rounded-2xl bg-[#E6C673] text-[#0B1021] text-sm sm:text-base font-extrabold transition-colors hover:bg-[#d4b45f]"
                        >
                            تأكيد تقديم الاستئناف المتقابل
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.05] font-bold transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
