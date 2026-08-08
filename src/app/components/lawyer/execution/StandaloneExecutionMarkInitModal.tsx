import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import type {
    StandaloneExecutionMark,
    StandaloneExecutionMarkTargetEntity,
    StandaloneExecutionMarkType,
} from '@/app/types/execution';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

type Draft = {
    markType: StandaloneExecutionMarkType | '';
    targetEntity: StandaloneExecutionMarkTargetEntity | '';
    markDetails: string;
    letterDetails: string;
};

export function StandaloneExecutionMarkInitModal(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    decisionId: string;
    initial?: StandaloneExecutionMark | null;
    disabled?: boolean;
    onSave: (draft: {
        markType: StandaloneExecutionMarkType;
        targetEntity: StandaloneExecutionMarkTargetEntity;
        markDetails: string;
        letterDetails: string;
    }) => void;
}) {
    const initialDraft: Draft = useMemo(
        () => ({
            markType: props.initial?.markType || '',
            targetEntity: props.initial?.targetEntity || '',
            markDetails: props.initial?.markDetails || '',
            letterDetails: props.initial?.letterDetails || '',
        }),
        [props.initial]
    );

    const [draft, setDraft] = useState<Draft>(initialDraft);

    useEffect(() => {
        if (!props.open) return;
        setDraft(initialDraft);
    }, [props.open, initialDraft]);

    const canSave =
        !props.disabled &&
        Boolean(String(draft.markType || '').trim()) &&
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                        نوع الشارة
                                    </label>
                                    <select
                                        value={draft.markType}
                                        onChange={(e) =>
                                            setDraft((p) => ({
                                                ...p,
                                                markType: e.target.value as StandaloneExecutionMarkType | '',
                                            }))
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                        disabled={props.disabled}
                                    >
                                        <option value="">اختر</option>
                                        <option value="تثبيت حجز احتياطي">تثبيت حجز احتياطي</option>
                                        <option value="مفاتحة عامة (مسجل الشركات)">مفاتحة عامة (مسجل الشركات)</option>
                                        <option value="تعميم منع تصرف">تعميم منع تصرف</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                        الجهة المستهدفة
                                    </label>
                                    <select
                                        value={draft.targetEntity}
                                        onChange={(e) =>
                                            setDraft((p) => ({
                                                ...p,
                                                targetEntity:
                                                    e.target.value as StandaloneExecutionMarkTargetEntity | '',
                                            }))
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                        disabled={props.disabled}
                                    >
                                        <option value="">اختر</option>
                                        <option value="التسجيل العقاري">التسجيل العقاري</option>
                                        <option value="المرور">المرور</option>
                                        <option value="مسجل الشركات">مسجل الشركات</option>
                                        <option value="أخرى">أخرى</option>
                                    </select>
                                </div>
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
                                        markType: draft.markType as StandaloneExecutionMarkType,
                                        targetEntity: draft.targetEntity as StandaloneExecutionMarkTargetEntity,
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


