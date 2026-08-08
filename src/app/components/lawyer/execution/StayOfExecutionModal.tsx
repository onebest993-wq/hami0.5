import React, { useCallback, useEffect, useState } from 'react';
import { X } from '@/app/components/ui/lucideIcons';

export interface StayOfExecutionModalProps {
    open: boolean;
    onClose: () => void;
    stayActive: boolean;
    onApplyStay: (input: {
        decision_number: string;
        court_name: string;
        next_hearing_date: string;
    }) => boolean;
}

/**
 * استئخار التنفيذ — نافذة مخصصة (بدل تبويب «حالات خاصة»).
 */
export const StayOfExecutionModal: React.FC<StayOfExecutionModalProps> = ({
    open,
    onClose,
    stayActive,
    onApplyStay,
}) => {
    const [stayDecision, setStayDecision] = useState('');
    const [stayCourt, setStayCourt] = useState('');
    const [stayHearing, setStayHearing] = useState('');

    useEffect(() => {
        if (!open) return;
        setStayDecision('');
        setStayCourt('');
        setStayHearing('');
    }, [open]);

    const submitStay = useCallback(() => {
        if (stayActive) return;
        const ok = onApplyStay({
            decision_number: stayDecision,
            court_name: stayCourt,
            next_hearing_date: stayHearing,
        });
        if (ok) {
            setStayDecision('');
            setStayCourt('');
            setStayHearing('');
            onClose();
        }
    }, [onApplyStay, onClose, stayActive, stayCourt, stayDecision, stayHearing]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[195] flex items-center justify-center bg-black/70 p-3"
            role="presentation"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-sm rounded-xl border border-[#E6C673]/25 bg-[#0A0F1C] shadow-xl text-right flex flex-col max-h-[min(520px,85vh)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2.5 py-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                    <h2 className="text-xs font-bold text-amber-100">استئخار التنفيذ</h2>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 space-y-2 text-right">
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                        يوقف أدوات الإضبارة حتى الرفع من الشريط التنبيهي أو زر الاستئناف في الترويسة.
                    </p>
                    {stayActive ? (
                        <p className="text-[10px] text-amber-200/90">
                            الاستئخار مفعّل — ارفعه من الشريط التنبيهي أو اضغط زر التشغيل في الترويسة.
                        </p>
                    ) : (
                        <>
                            <label className="block text-[9px] text-slate-400">اسم المحكمة (إجباري)</label>
                            <input
                                value={stayCourt}
                                onChange={(e) => setStayCourt(e.target.value)}
                                placeholder="اسم المحكمة"
                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-white placeholder:text-slate-600"
                            />
                            <label className="block text-[9px] text-slate-400">رقم القرار (اختياري)</label>
                            <input
                                value={stayDecision}
                                onChange={(e) => setStayDecision(e.target.value)}
                                placeholder="رقم القرار"
                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-white placeholder:text-slate-600"
                            />
                            <label className="block text-[9px] text-slate-400">تاريخ الجلسة / المتابعة (إجباري)</label>
                            <input
                                type="date"
                                value={stayHearing}
                                onChange={(e) => setStayHearing(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-white font-mono"
                            />
                            <button
                                type="button"
                                onClick={submitStay}
                                className="w-full rounded-lg bg-amber-800/90 py-2 text-[10px] font-bold text-white shadow-md shadow-amber-950/40 hover:bg-amber-700/90"
                            >
                                تفعيل الاستئخار
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
