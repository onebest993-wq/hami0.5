import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { StandaloneExecutionMark, StandaloneExecutionMarkType } from '@/app/types/execution';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

const PRESET_MARK_TYPES: StandaloneExecutionMarkType[] = [
    'تثبيت حجز احتياطي',
    'مفاتحة عامة',
    'تعميم منع تصرف',
    'يدوي',
];

type Draft = {
    markTypeChoice: StandaloneExecutionMarkType | '';
    markTypeManual: string;
    targetEntity: string;
    markDetails: string;
    letterDetails: string;
};

function resolveInitialDraft(initial?: StandaloneExecutionMark | null): Draft {
    const storedType = String(initial?.markType || '').trim();
    const isPreset = PRESET_MARK_TYPES.includes(storedType as StandaloneExecutionMarkType) && storedType !== 'يدوي';
    return {
        markTypeChoice: isPreset
            ? (storedType as StandaloneExecutionMarkType)
            : storedType
              ? 'يدوي'
              : '',
        markTypeManual: isPreset || !storedType ? '' : storedType,
        targetEntity: String(initial?.targetEntity || ''),
        markDetails: initial?.markDetails || '',
        letterDetails: initial?.letterDetails || '',
    };
}

export function StandaloneExecutionMarkInitModal(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    decisionId: string;
    initial?: StandaloneExecutionMark | null;
    disabled?: boolean;
    onSave: (draft: {
        markType: string;
        targetEntity: string;
        markDetails: string;
        letterDetails: string;
    }) => void;
}) {
    const initialDraft: Draft = useMemo(() => resolveInitialDraft(props.initial), [props.initial]);

    const [draft, setDraft] = useState<Draft>(initialDraft);

    useEffect(() => {
        if (!props.open) return;
        setDraft(initialDraft);
    }, [props.open, initialDraft]);

    const markTypeChoice = String(draft.markTypeChoice || '').trim();
    const resolvedMarkType =
        markTypeChoice === 'يدوي' ? String(draft.markTypeManual || '').trim() : markTypeChoice;

    const canSave =
        !props.disabled &&
        Boolean(resolvedMarkType) &&
        Boolean(String(draft.targetEntity || '').trim()) &&
        Boolean(draft.markDetails.trim());

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
                    className="w-full max-w-[720px] rounded-3xl border-2 border-amber-500/35 bg-[#0B1120] shadow-2xl shadow-black/60"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                >
                    <div className="sticky top-0 flex items-center justify-between border-b border-amber-500/20 bg-[#0B1120] p-4">
                        <button
                            type="button"
                            onClick={() => props.onOpenChange(false)}
                            className="rounded-lg p-2 text-slate-200 hover:bg-amber-500/15"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-right text-base font-black text-amber-200">
                            شارة تنفيذية / تعميم — إجراء إداري
                        </h3>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    نوع الشارة
                                </label>
                                <select
                                    value={draft.markTypeChoice}
                                    onChange={(e) =>
                                        setDraft((p) => ({
                                            ...p,
                                            markTypeChoice: e.target.value as StandaloneExecutionMarkType | '',
                                            markTypeManual:
                                                e.target.value === 'يدوي' ? p.markTypeManual : '',
                                        }))
                                    }
                                    className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[#0A0F1C] px-3 py-2 text-[12px] text-slate-100 text-right focus:border-amber-500/40 focus:outline-none [color-scheme:dark]"
                                    disabled={props.disabled}
                                >
                                    <option value="" className="bg-[#0A0F1C] text-slate-400">
                                        اختر نوع الشارة
                                    </option>
                                    <option value="تثبيت حجز احتياطي" className="bg-[#0A0F1C] text-white">
                                        تثبيت حجز احتياطي
                                    </option>
                                    <option value="مفاتحة عامة" className="bg-[#0A0F1C] text-white">
                                        مفاتحة عامة
                                    </option>
                                    <option value="تعميم منع تصرف" className="bg-[#0A0F1C] text-white">
                                        تعميم منع تصرف
                                    </option>
                                    <option value="يدوي" className="bg-[#0A0F1C] text-white">
                                        يدوي (إدخال حر)
                                    </option>
                                </select>
                            </div>

                            {markTypeChoice === 'يدوي' ? (
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                        نوع الشارة (يدوي)
                                    </label>
                                    <input
                                        type="text"
                                        value={draft.markTypeManual}
                                        onChange={(e) =>
                                            setDraft((p) => ({ ...p, markTypeManual: e.target.value }))
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                        placeholder="اكتب نوع الشارة يدوياً..."
                                        disabled={props.disabled}
                                    />
                                </div>
                            ) : null}

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    الجهة المستهدفة
                                </label>
                                <input
                                    type="text"
                                    value={draft.targetEntity}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, targetEntity: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="مثال: دائرة التسجيل العقاري / مديرية المرور..."
                                    disabled={props.disabled}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    رقم/تاريخ الكتاب
                                </label>
                                <input
                                    type="text"
                                    value={draft.letterDetails}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, letterDetails: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="مثال: 55 في 2026/04/11"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    تفاصيل القيد
                                </label>
                                <textarea
                                    value={draft.markDetails}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, markDetails: e.target.value }))
                                    }
                                    className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="تفاصيل القيد/التعميم..."
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
                                className="rounded-xl bg-gradient-to-l from-amber-500 to-orange-700 px-5 py-2 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                                onClick={() => {
                                    props.onSave({
                                        markType: resolvedMarkType,
                                        targetEntity: String(draft.targetEntity || '').trim(),
                                        markDetails: draft.markDetails.trim(),
                                        letterDetails: String(draft.letterDetails || '').trim(),
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
