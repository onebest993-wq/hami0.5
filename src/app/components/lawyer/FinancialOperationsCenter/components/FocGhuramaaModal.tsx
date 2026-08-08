import React from 'react';
import { motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import { FocModalPortal } from './FocModalPortal';

export interface FocGhuramaaEligibleCreditor {
    creditorId: string;
    creditorName: string;
}

export interface FocGhuramaaModalProps {
    open: boolean;
    onClose: () => void;
    available: number;
    eligible: FocGhuramaaEligibleCreditor[];
    note: string | null;
    shareInputs: Record<string, string>;
    onShareInputChange: (creditorId: string, raw: string) => void;
    onEqualSplit: () => void;
    manualSum: number;
    validationNote: string | null;
    partialWarning: string | null;
    remainingAfter: number;
    isEqualMode: boolean;
    canConfirm: boolean;
    onConfirm: () => void;
}

export const FocGhuramaaModal: React.FC<FocGhuramaaModalProps> = ({
    open,
    onClose,
    available,
    eligible,
    note,
    shareInputs,
    onShareInputChange,
    onEqualSplit,
    manualSum,
    validationNote,
    partialWarning,
    remainingAfter,
    isEqualMode,
    canConfirm,
    onConfirm,
}) => {
    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/55">
            <motion.div
                initial={{ scale: 0.98, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 8 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl"
                dir="rtl"
            >
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400"
                    >
                        <X size={18} />
                    </button>
                    <h4 className="text-sm font-black text-amber-200">قسمة الغرماء — توزيع الأمانات</h4>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
                        <p className="text-[10px] text-slate-500">رصيد الأمانات المتاح</p>
                        <p className="mt-0.5 text-[13px] font-black tabular-nums text-slate-100">
                            {available.toLocaleString('ar-IQ')} د.ع
                        </p>
                    </div>
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-right">
                        <p className="text-[10px] text-amber-200/80">المبلغ الذي سيتم توزيعه</p>
                        <p className="mt-0.5 text-[13px] font-black tabular-nums text-amber-100">
                            {manualSum.toLocaleString('ar-IQ')} د.ع
                        </p>
                    </div>
                </div>

                {validationNote ? (
                    <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-right text-[11px] text-rose-200">
                        {validationNote}
                    </div>
                ) : null}

                {partialWarning ? (
                    <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-right text-[11px] text-amber-100">
                        {partialWarning}
                    </div>
                ) : null}

                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={onEqualSplit}
                        disabled={eligible.length === 0 || available <= 0}
                        className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        تقسيم بالتساوي
                    </button>
                </div>

                <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className="grid grid-cols-2 gap-0 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-slate-400">
                        <div className="text-right">الدائن</div>
                        <div className="text-right">حصة الدائن</div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {eligible.length > 0 ? (
                            eligible.map((c) => (
                                <div
                                    key={c.creditorId}
                                    className="grid grid-cols-2 gap-2 border-b border-white/5 px-3 py-2 text-[11px] text-slate-200 items-center"
                                >
                                    <div className="truncate text-right font-bold">{c.creditorName}</div>
                                    <div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="أدخل المبلغ"
                                            value={shareInputs[c.creditorId] ?? ''}
                                            onChange={(e) =>
                                                onShareInputChange(c.creditorId, e.target.value)
                                            }
                                            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-white text-right text-[11px] tabular-nums placeholder:text-slate-500"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-3 text-[11px] text-slate-400 text-right">
                                {note || 'لا توجد بيانات قابلة للعرض.'}
                            </div>
                        )}
                    </div>
                </div>

                {!isEqualMode && manualSum > 0 ? (
                    <p className="mt-2 text-[10px] text-slate-400 text-right">
                        المتبقي من الأمانات بعد التوزيع:{' '}
                        <span
                            className={`font-black tabular-nums ${
                                remainingAfter > 0 ? 'text-amber-200' : 'text-slate-200'
                            }`}
                        >
                            {remainingAfter.toLocaleString('ar-IQ')} د.ع
                        </span>
                    </p>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-bold text-slate-200"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        className="flex-1 rounded-xl bg-amber-600/80 py-2.5 text-xs font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        اعتماد وتوزيع القسمة
                    </button>
                </div>
            </motion.div>
        </FocModalPortal>
    );
};
