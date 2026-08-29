import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';
import type { LawyerFeeDisburseMode } from './ExecutionSolidaryAndEvictionFollowupModalsContainer.types';
import type { EvictionLawyerFeeFollowupModalProps } from './EvictionFollowupModalsChunk.types';

/** مودال طلب صرف أتعاب محكومة للتخلية */
export function EvictionLawyerFeeFollowupModal(p: EvictionLawyerFeeFollowupModalProps) {
    const {
        setShowEvictionLawyerFeeModal,
        onCloseEvictionLawyerFeeModal,
        parsedLawyerFees,
        lawyerFeeDisburseMode,
        setLawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        setLawyerFeeDisburseNotes,
        runEvictionLawyerFeeSubmit,
        nestedOverUnifiedZIndex,
    } = p;

    const closeEvictionLawyerFeeModal = () => {
        if (typeof onCloseEvictionLawyerFeeModal === 'function') onCloseEvictionLawyerFeeModal();
        else setShowEvictionLawyerFeeModal?.(false);
    };

    return (
        <div
            className={`fixed inset-0 bg-black/70 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: nestedOverUnifiedZIndex }}
            onClick={() => closeEvictionLawyerFeeModal()}
        >
            <div
                className="bg-[#0B1120] border-2 border-emerald-500/40 rounded-3xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`sticky top-0 bg-[#0B1120] border-b border-emerald-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                >
                    <button
                        type="button"
                        onClick={() => closeEvictionLawyerFeeModal()}
                        className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-emerald-500/20`}
                    >
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-emerald-400 font-bold text-lg text-right pr-2">
                        طلب صرف أتعاب محكومة
                    </h2>
                </div>
                <div className="p-5 space-y-4 text-right">
                    <p className="text-gray-400 text-xs leading-relaxed">
                        حدّد كيفية التحصيل من المدين (يتحمّل الأتعاب حتى في التخلية). يُدرَج في طلب منفذ العدل.
                    </p>
                    <p className="text-emerald-200/90 text-sm font-bold tabular-nums">
                        المبلغ المحكوم (من الإضبارة):{' '}
                        {parsedLawyerFees > 0
                            ? `${parsedLawyerFees.toLocaleString('ar-IQ')} د.ع`
                            : 'غير محدد — أضف الأتعاب في بيانات الإضبارة'}
                    </p>
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-2">
                            طريقة الصرف / التحصيل
                        </label>
                        <select
                            value={lawyerFeeDisburseMode}
                            onChange={(e) =>
                                setLawyerFeeDisburseMode(e.target.value as LawyerFeeDisburseMode)
                            }
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm text-right"
                        >
                            <option value="lump_sum">دفعة واحدة / صفقة</option>
                            <option value="salary_fifth">خُمس الراتب (المدين موظف)</option>
                            <option value="settlement">تسوية أو أقساط باتفاق</option>
                        </select>
                    </div>
                    <textarea
                        placeholder="تفاصيل إضافية للمنفذ (اختياري)"
                        value={lawyerFeeDisburseNotes}
                        onChange={(e) => setLawyerFeeDisburseNotes(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm text-right resize-none"
                    />
                    <div className="flex gap-2 flex-row-reverse">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                void runEvictionLawyerFeeSubmit(e);
                            }}
                            className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all`}
                        >
                            إرسال الطلب للقرارات
                        </button>
                        <button
                            type="button"
                            onClick={() => closeEvictionLawyerFeeModal()}
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
