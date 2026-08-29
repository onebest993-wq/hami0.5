import React from 'react';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';
import type { EvictionExpensePayMode } from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';
import type { EvictionExpenseFollowupModalProps } from './EvictionFollowupModalsChunk.types';

/** مودال مصاريف إضبارة التخلية */
export function EvictionExpenseFollowupModal(p: EvictionExpenseFollowupModalProps) {
    const {
        setShowEvictionExpenseModal,
        onCloseEvictionExpenseModal,
        evictionExpensePayMode,
        setEvictionExpensePayMode,
        evictionExpenseAmount,
        setEvictionExpenseAmount,
        evictionExpenseNote,
        setEvictionExpenseNote,
        runEvictionExpenseSubmit,
        nestedOverUnifiedZIndex,
    } = p;

    const closeEvictionExpenseModal = () => {
        if (typeof onCloseEvictionExpenseModal === 'function') onCloseEvictionExpenseModal();
        else setShowEvictionExpenseModal?.(false);
    };

    return (
        <div
            className={`fixed inset-0 bg-black/70 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: nestedOverUnifiedZIndex }}
            onClick={() => closeEvictionExpenseModal()}
        >
            <div
                className="bg-[#0B1120] border-2 border-amber-500/40 rounded-3xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`sticky top-0 bg-[#0B1120] border-b border-amber-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <button
                        type="button"
                        onClick={() => closeEvictionExpenseModal()}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-amber-500/20`}
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-amber-400 font-bold text-lg text-right pr-2">
                        مصاريف إضبارة التخلية
                    </h2>
                </div>
                <div className="p-5 space-y-4 text-right">
                    <p className="text-gray-400 text-xs leading-relaxed">
                        سجّل ما صُرف لإتمام التخلية (نقل، أجور، إلخ). يُفتح تبويب الأموال المحجوزة تلقائياً عند
                        الحاجة لمتابعة الحجز أو الصرف.
                    </p>
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-2">
                            أسلوب التحصيل من المدين
                        </label>
                        <select
                            value={evictionExpensePayMode}
                            onChange={(e) =>
                                setEvictionExpensePayMode(e.target.value as EvictionExpensePayMode)
                            }
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm text-right"
                        >
                            <option value="lump_sum">دفعة واحدة / صفقة</option>
                            <option value="salary_fifth">من خُمس راتب المدين (موظف)</option>
                            <option value="installments">تسوية / أقساط</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="المبلغ (د.ع)"
                        value={evictionExpenseAmount}
                        onChange={(e) => setEvictionExpenseAmount(formatNumberInput(e.target.value))}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                    />
                    <textarea
                        placeholder="بيان المصروف (اختياري)"
                        value={evictionExpenseNote}
                        onChange={(e) => setEvictionExpenseNote(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm text-right resize-none"
                    />
                    <div className="flex gap-2 flex-row-reverse">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                void runEvictionExpenseSubmit(e);
                            }}
                            className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all`}
                        >
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={() => closeEvictionExpenseModal()}
                            className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-slate-700/60 border border-slate-600/50 text-slate-200 font-semibold py-3 rounded-xl`}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
