import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { ThirdPartySeizure } from '@/app/types/execution';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

type Draft = {
    thirdPartyName: string;
    requestedAmount: string;
    notificationDateYmd: string;
};

export function ThirdPartySeizureInitModal(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    decisionId: string;
    initial?: ThirdPartySeizure | null;
    disabled?: boolean;
    onSave: (draft: {
        thirdPartyName: string;
        requestedAmountIqd: number | null;
        notificationDateIso: string | null;
    }) => void;
}) {
    const initialDraft: Draft = useMemo(
        () => ({
            thirdPartyName: props.initial?.thirdPartyName || '',
            requestedAmount:
                typeof props.initial?.requestedAmountIqd === 'number' &&
                Number.isFinite(props.initial.requestedAmountIqd) &&
                props.initial.requestedAmountIqd > 0
                    ? String(props.initial.requestedAmountIqd)
                    : '',
            notificationDateYmd: (() => {
                const raw = String(props.initial?.notificationDateIso || '').trim();
                const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
                return m ? m[0] : '';
            })(),
        }),
        [props.initial]
    );

    const [draft, setDraft] = useState<Draft>(initialDraft);

    useEffect(() => {
        if (!props.open) return;
        setDraft(initialDraft);
    }, [props.open, initialDraft]);

    const parsedRequestedAmount = (() => {
        const raw = String(draft.requestedAmount || '').trim();
        const parsed = raw ? Number(raw.replace(/,/g, '').trim()) : NaN;
        return !raw || !Number.isFinite(parsed) || parsed <= 0 ? null : Math.trunc(parsed);
    })();
    const canSave =
        !props.disabled &&
        Boolean(draft.thirdPartyName.trim()) &&
        typeof parsedRequestedAmount === 'number' &&
        parsedRequestedAmount > 0 &&
        Boolean(String(draft.notificationDateYmd || '').trim());

    if (!props.open || typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
                role="presentation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) props.onOpenChange(false);
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="w-full max-w-[720px] rounded-3xl border-2 border-cyan-500/30 bg-[#0B1120] shadow-2xl shadow-black/60"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                >
                    <div className="sticky top-0 flex items-center justify-between border-b border-cyan-500/20 bg-[#0B1120] p-4">
                        <button
                            type="button"
                            onClick={() => props.onOpenChange(false)}
                            className="rounded-lg p-2 text-slate-200 hover:bg-cyan-500/15"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-right text-base font-black text-cyan-200">
                            حجز مال المدين لدى الغير — بعد موافقة المنفذ
                        </h3>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    اسم الجهة/الشخص المحجوز لديه
                                </label>
                                <input
                                    type="text"
                                    value={draft.thirdPartyName}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, thirdPartyName: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="مثال: مصرف الرافدين"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    المبلغ المطلوب حجزه (د.ع)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={draft.requestedAmount}
                                    onChange={(e) =>
                                        setDraft((p) => ({
                                            ...p,
                                            requestedAmount: e.target.value.replace(/[^\d]/g, ''),
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                    placeholder="مثال: 5000000"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    تاريخ تبليغ الجهة (YYYY-MM-DD)
                                </label>
                                <input
                                    type="date"
                                    value={draft.notificationDateYmd}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, notificationDateYmd: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    disabled={props.disabled}
                                />
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-slate-200 hover:bg-white/10"
                                onClick={() => props.onOpenChange(false)}
                            >
                                إغلاق
                            </button>
                            <button
                                type="button"
                                disabled={!canSave}
                                className="rounded-xl bg-gradient-to-l from-cyan-500 to-sky-700 px-5 py-2 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                                onClick={() => {
                                    const ymd = String(draft.notificationDateYmd || '').trim();
                                    const iso = (() => {
                                        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
                                        const dt = new Date(`${ymd}T00:00:00.000Z`);
                                        return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
                                    })();
                                    props.onSave({
                                        thirdPartyName: draft.thirdPartyName.trim(),
                                        requestedAmountIqd: parsedRequestedAmount,
                                        notificationDateIso: iso,
                                    });
                                }}
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}


