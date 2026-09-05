import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { PencilLine } from '@/app/components/ui/icons/PencilLine';
import { FocModalPortal } from './FocModalPortal';
import { formatIqdDisplay, formatNumberInput, parseAmount } from '../utils';
import { FOC_MODAL_ACTION_BTN, FOC_MODAL_CLOSE_BTN } from '../constants';

export interface DebtTotalsEditModalProps {
    open: boolean;
    onClose: () => void;
    /** يُعرض للقراءة فقط — التعديل على المتبقي فقط */
    totalInput: string;
    setTotalInput: (v: string) => void;
    remainingInput: string;
    setRemainingInput: (v: string) => void;
    onSave: () => void;
    disabled?: boolean;
    lockReason?: string | null;
    showAlimonyAccrualNote?: boolean;
}

export const DebtTotalsEditModal: React.FC<DebtTotalsEditModalProps> = ({
    open,
    onClose,
    totalInput,
    remainingInput,
    setRemainingInput,
    onSave,
    disabled = false,
    lockReason = null,
    showAlimonyAccrualNote = false,
}) => {
    const totalParsed = parseAmount(totalInput);
    const remainingParsed = parseAmount(remainingInput);
    const invalidRemaining =
        Number.isFinite(totalParsed) &&
        Number.isFinite(remainingParsed) &&
        remainingParsed > totalParsed;

    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/50">
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="w-full max-w-sm rounded-xl bg-[#0A1122]/92 backdrop-blur-xl border border-white/10 p-4 space-y-3 shadow-2xl"
                dir="rtl"
            >
                <div className="flex items-center justify-between gap-2" dir="rtl">
                    <h4 className="text-[13px] font-semibold text-[#E6C673] flex items-center gap-1.5">
                        <PencilLine size={14} aria-hidden />
                        تعديل المتبقي
                    </h4>
                    <button
                        type="button"
                        onClick={onClose}
                        className={FOC_MODAL_CLOSE_BTN}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                {lockReason ? (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-950/25 px-2.5 py-2 text-[10px] font-semibold text-rose-200/95 leading-relaxed">
                        {lockReason}
                    </p>
                ) : null}

                {showAlimonyAccrualNote ? (
                    <p className="text-[9px] text-amber-200/85 leading-relaxed rounded-lg border border-amber-500/25 bg-amber-950/20 px-2.5 py-1.5">
                        في مسار النفقة المستمرة قد يُعاد احتساب الوعاء تلقائياً عند تراكم أشهر جديدة.
                    </p>
                ) : null}

                <p className="text-[9px] text-slate-500 leading-relaxed">
                    يُعدَّل متبقي الدين فقط مع الإبقاء على إجمالي الوعاء وبنود الأتعاب والمصاريف.
                </p>

                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-right">
                    <p className="text-[9px] font-medium text-slate-500">إجمالي الدين (ثابت)</p>
                    <p className="text-[13px] font-bold tabular-nums text-white/90">
                        {Number.isFinite(totalParsed) ? formatIqdDisplay(totalParsed) : '—'}{' '}
                        <span className="text-[9px] font-medium text-slate-500">د.ع</span>
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[9px] font-semibold text-slate-400">
                        متبقي الدين (د.ع)
                    </label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={remainingInput}
                        disabled={disabled || Boolean(lockReason)}
                        onChange={(e) => setRemainingInput(formatNumberInput(e.target.value))}
                        className={[
                            'w-full rounded-lg bg-white/5 border px-3 py-2.5 text-white text-right text-[13px] font-bold tabular-nums placeholder:text-slate-500 focus:outline-none disabled:opacity-40',
                            invalidRemaining
                                ? 'border-rose-400/45 focus:border-rose-400/45'
                                : 'border-white/10 focus:border-[#E6C673]/40',
                        ].join(' ')}
                        placeholder="المتبقي على المدين"
                    />
                    {invalidRemaining ? (
                        <p className="text-[9px] font-semibold text-rose-300/90">
                            المتبقي لا يمكن أن يتجاوز الإجمالي (
                            {Number.isFinite(totalParsed) ? formatIqdDisplay(totalParsed) : '—'} د.ع)
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-lg border border-white/10 py-2 text-[11px] font-bold text-slate-400 hover:bg-white/[0.04] ${FOC_MODAL_ACTION_BTN}`}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={
                            disabled ||
                            Boolean(lockReason) ||
                            !Number.isFinite(totalParsed) ||
                            totalParsed <= 0 ||
                            !Number.isFinite(remainingParsed) ||
                            remainingParsed < 0 ||
                            invalidRemaining
                        }
                        className={`rounded-lg bg-gradient-to-l from-[#E6C673] to-amber-700 py-2 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40 disabled:cursor-not-allowed ${FOC_MODAL_ACTION_BTN}`}
                    >
                        حفظ المتبقي
                    </button>
                </div>
            </motion.div>
        </FocModalPortal>
    );
};
