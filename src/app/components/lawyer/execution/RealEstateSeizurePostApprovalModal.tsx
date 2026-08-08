import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from '@/app/components/ui/lucideIcons';
import type { RealEstateGender, RealEstateSeizureAsset } from '@/app/types/execution';
import { EXEC_MODAL_BACKDROP_STRONG, EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

type Draft = {
    propertyNoAndDistrict: string;
    propertyGender: RealEstateGender | '';
    deedNotes: string;
};

export function RealEstateSeizurePostApprovalModal(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    decisionId: string;
    initial?: RealEstateSeizureAsset | null;
    disabled?: boolean;
    onSave: (draft: {
        propertyNoAndDistrict: string;
        propertyGender: RealEstateGender;
        deedNotes: string;
    }) => void;
}) {
    const initialDraft: Draft = useMemo(
        () => ({
            propertyNoAndDistrict: props.initial?.propertyNoAndDistrict || '',
            propertyGender: props.initial?.propertyGender || '',
            deedNotes: props.initial?.deedNotes || '',
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
        Boolean(draft.propertyNoAndDistrict.trim()) &&
        Boolean(String(draft.propertyGender || '').trim());

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
                    className="w-full max-w-[720px] rounded-3xl border-2 border-sky-500/35 bg-[#0B1120] shadow-2xl shadow-black/60"
                    onClick={(e) => e.stopPropagation()}
                    dir="rtl"
                >
                    <div className="sticky top-0 flex items-center justify-between border-b border-sky-500/20 bg-[#0B1120] p-4">
                        <button
                            type="button"
                            onClick={() => props.onOpenChange(false)}
                            className="rounded-lg p-2 text-slate-200 hover:bg-sky-500/15"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-right text-base font-black text-sky-200">
                            بيانات حجز العقار — بعد موافقة المنفذ
                        </h3>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    رقم العقار والمقاطعة
                                </label>
                                <input
                                    type="text"
                                    value={draft.propertyNoAndDistrict}
                                    onChange={(e) =>
                                        setDraft((p) => ({
                                            ...p,
                                            propertyNoAndDistrict: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="مثال: 123/مقاطعة 4"
                                    disabled={props.disabled}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                        جنس العقار
                                    </label>
                                    <select
                                        value={draft.propertyGender}
                                        onChange={(e) =>
                                            setDraft((p) => ({
                                                ...p,
                                                propertyGender: e.target.value as RealEstateGender | '',
                                            }))
                                        }
                                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                        disabled={props.disabled}
                                    >
                                        <option value="">اختر</option>
                                        <option value="دار">دار</option>
                                        <option value="شقة">شقة</option>
                                        <option value="عرصة">عرصة</option>
                                        <option value="بستان">بستان</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    تفاصيل السند والملاحظات
                                </label>
                                <textarea
                                    value={draft.deedNotes}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, deedNotes: e.target.value }))
                                    }
                                    className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                                    placeholder="أدخل رقم/نوع السند، القيود، الملاحظات القانونية..."
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
                                className="rounded-xl bg-gradient-to-l from-sky-500 to-cyan-700 px-5 py-2 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                                onClick={() => {
                                    props.onSave({
                                        propertyNoAndDistrict: draft.propertyNoAndDistrict.trim(),
                                        propertyGender: draft.propertyGender as RealEstateGender,
                                        deedNotes: String(draft.deedNotes || '').trim(),
                                    });
                                }}
                            >
                                حفظ بيانات العقار
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}


