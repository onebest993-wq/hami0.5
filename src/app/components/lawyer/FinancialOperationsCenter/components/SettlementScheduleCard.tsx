import React from 'react';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { BTN_SETTLEMENT_APPLY } from '../constants';
import { formatIqdDisplay, formatNumberInput, parseAmount } from '../utils';

export interface SettlementScheduleCardProps {
    settlementInput: string;
    setSettlementInput: (v: string) => void;
    settlementDueDateInput: string;
    setSettlementDueDateInput: (v: string) => void;
    canApply: boolean;
    onSave: () => void;
    isUpdate?: boolean;
}

export const SettlementScheduleCard: React.FC<SettlementScheduleCardProps> = ({
    settlementInput,
    setSettlementInput,
    settlementDueDateInput,
    setSettlementDueDateInput,
    canApply,
    onSave,
    isUpdate = false,
}) => {
    const [confirmOpen, setConfirmOpen] = React.useState(false);

    React.useEffect(() => {
        setConfirmOpen(false);
    }, [settlementInput, settlementDueDateInput, isUpdate]);

    const amount = parseAmount(settlementInput);
    const amountLabel = Number.isFinite(amount) ? formatIqdDisplay(amount) : '—';

    const handleReview = () => {
        if (!canApply || !settlementDueDateInput.trim()) return;
        setConfirmOpen(true);
    };

    const handleConfirm = () => {
        onSave();
        setConfirmOpen(false);
    };

    return (
        <div className="space-y-2.5 text-right">
            <p className="text-[11px] font-semibold text-slate-200">
                {isUpdate ? 'تعديل التسوية المجدولة' : 'إعداد التسوية المالية'}
            </p>

            <div className="space-y-1">
                <label className="block text-[9px] font-medium text-slate-500">مبلغ التسوية (د.ع)</label>
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="مبلغ القسط أو التسوية"
                    value={settlementInput}
                    onChange={(e) => setSettlementInput(formatNumberInput(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-right text-[13px] font-bold tabular-nums text-white placeholder:text-slate-600 focus:border-[#E6C673]/35 focus:outline-none"
                />
            </div>

            <div className="space-y-1">
                <label className="block text-[9px] font-medium text-slate-500">موعد السداد</label>
                <input
                    type="date"
                    value={settlementDueDateInput}
                    onChange={(e) => setSettlementDueDateInput(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-right text-[13px] font-semibold tabular-nums text-white focus:border-[#E6C673]/35 focus:outline-none"
                />
            </div>

            {!confirmOpen ? (
                <button
                    type="button"
                    onClick={handleReview}
                    disabled={!canApply || !settlementDueDateInput}
                    className={`${BTN_SETTLEMENT_APPLY} w-full min-h-[40px] rounded-lg py-2 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                    {isUpdate ? 'مراجعة تحديث التسوية' : 'مراجعة وحفظ التسوية'}
                </button>
            ) : null}

            <AnimatePresence initial={false}>
                {confirmOpen ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-lg border border-amber-400/25 bg-amber-950/20 p-2.5 space-y-2"
                    >
                        <p className="text-[11px] font-semibold text-amber-100/90">تأكيد قبل الحفظ</p>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                            مبلغ التسوية:{' '}
                            <span className="font-bold text-[#E6C673] tabular-nums">{amountLabel} د.ع</span>
                            <br />
                            موعد السداد:{' '}
                            <span className="font-semibold text-slate-100 tabular-nums">
                                {settlementDueDateInput}
                            </span>
                        </p>
                        <p className="text-[9px] text-slate-500">
                            بعد التأكيد لا يمكن التراجع إلا عبر «تعديل التسوية» أو «إلغاء التسوية».
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="rounded-lg border border-white/12 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={`${BTN_SETTLEMENT_APPLY} rounded-lg py-2 text-[10px]`}
                            >
                                تأكيد الحفظ
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};
