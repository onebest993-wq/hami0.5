import React from 'react';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { CalendarClock } from '@/app/components/ui/icons/CalendarClock';
import { Handshake } from '@/app/components/ui/icons/Handshake';
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
        <div className="space-y-3 text-right">
            <div className="flex flex-row-reverse items-center gap-2">
                <Handshake size={15} className="text-cyan-400 shrink-0" />
                <p className="text-[11px] font-bold text-cyan-100/90">
                    {isUpdate ? 'تعديل التسوية المجدولة' : 'إعداد التسوية المالية'}
                </p>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400">مبلغ التسوية (د.ع)</label>
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="مبلغ القسط أو التسوية"
                    value={settlementInput}
                    onChange={(e) => setSettlementInput(formatNumberInput(e.target.value))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm font-bold tabular-nums placeholder:text-slate-500 focus:border-cyan-400/35 focus:outline-none"
                />
            </div>

            <div className="space-y-1.5">
                <label className="flex flex-row-reverse items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <CalendarClock size={12} className="text-cyan-400/80" />
                    موعد السداد
                </label>
                <input
                    type="date"
                    value={settlementDueDateInput}
                    onChange={(e) => setSettlementDueDateInput(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-right text-sm font-semibold tabular-nums focus:border-cyan-400/35 focus:outline-none"
                />
            </div>

            {!confirmOpen ? (
                <button
                    type="button"
                    onClick={handleReview}
                    disabled={!canApply || !settlementDueDateInput}
                    className={`${BTN_SETTLEMENT_APPLY} w-full disabled:opacity-40 disabled:cursor-not-allowed`}
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
                        className="overflow-hidden rounded-xl border border-amber-400/30 bg-amber-950/25 p-3 space-y-2.5"
                    >
                        <p className="text-[11px] font-bold text-amber-100/90">تأكيد قبل الحفظ</p>
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                            مبلغ التسوية:{' '}
                            <span className="font-black text-cyan-100 tabular-nums">{amountLabel} د.ع</span>
                            <br />
                            موعد السداد:{' '}
                            <span className="font-semibold text-cyan-100 tabular-nums">
                                {settlementDueDateInput}
                            </span>
                        </p>
                        <p className="text-[9px] text-slate-500">
                            بعد التأكيد لا يمكن التراجع إلا عبر «تعديل التسوية» أو «إلغاء التسوية».
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="rounded-lg border border-white/15 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={`${BTN_SETTLEMENT_APPLY} py-2 text-[10px]`}
                            >
                                {isUpdate ? 'تأكيد التحديث' : 'تأكيد الحفظ'}
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};
