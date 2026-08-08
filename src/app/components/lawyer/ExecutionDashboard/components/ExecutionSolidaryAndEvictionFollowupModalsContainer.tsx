import React from 'react';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import { evictionInclusiveCalendarDays } from '../helpers';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';

export type SolidaryTargetDebtorRow = {
    id: string;
    name: string;
    cleared: boolean;
};

export type EvictionExpensePayMode = 'salary_fifth' | 'lump_sum' | 'installments';
export type LawyerFeeDisburseMode = 'salary_fifth' | 'lump_sum' | 'settlement';

export interface ExecutionSolidaryAndEvictionFollowupModalsContainerProps {
    showSolidaryCoerciveTargetModal: boolean;
    solidaryCoerciveActionPending: string | null;
    setShowSolidaryCoerciveTargetModal?: (show: boolean) => void;
    onCloseSolidaryCoerciveTargetModal?: () => void;
    setSolidaryCoerciveActionPending?: (v: string | null) => void;
    EXEC_MODAL_BACKDROP_STRONG: string;
    nestedOverUnifiedZIndex: number;
    allDebtorsUnified: SolidaryTargetDebtorRow[];
    coerciveSubjectRef: React.MutableRefObject<{ id: string; name: string }>;
    saveCoerciveActionRef: React.MutableRefObject<(actionType: string, details: Record<string, string>) => void>;
    buildInitialExecutorSeizureDetails: (actionType: string) => Record<string, string>;
    setShowCoerciveActionForm: (v: string | null) => void;

    showEvictionExpenseModal: boolean;
    isEvictionExecutionModule: boolean;
    setShowEvictionExpenseModal?: (show: boolean) => void;
    onCloseEvictionExpenseModal?: () => void;
    evictionExpensePayMode: EvictionExpensePayMode;
    setEvictionExpensePayMode: React.Dispatch<React.SetStateAction<EvictionExpensePayMode>>;
    evictionExpenseAmount: string;
    setEvictionExpenseAmount: (v: string) => void;
    evictionExpenseNote: string;
    setEvictionExpenseNote: (v: string) => void;
    runEvictionExpenseSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;

    showEvictionLawyerFeeModal: boolean;
    setShowEvictionLawyerFeeModal?: (show: boolean) => void;
    onCloseEvictionLawyerFeeModal?: () => void;
    parsedLawyerFees: number;
    lawyerFeeDisburseMode: LawyerFeeDisburseMode;
    setLawyerFeeDisburseMode: React.Dispatch<React.SetStateAction<LawyerFeeDisburseMode>>;
    lawyerFeeDisburseNotes: string;
    setLawyerFeeDisburseNotes: (v: string) => void;
    runEvictionLawyerFeeSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;

    showEvictionResidentialGraceModal: boolean;
    setShowEvictionResidentialGraceModal?: (show: boolean) => void;
    onCloseEvictionResidentialGraceModal?: () => void;
    graceModalStartYmd: string;
    setGraceModalStartYmd: (v: string) => void;
    graceModalEndYmd: string;
    setGraceModalEndYmd: (v: string) => void;
    residentialVacateDeadlineMaxIso: string;
    residentialGraceModalShowPrimarySave: boolean;
    submitEvictionResidentialGraceFromModal: () => void;
}

export const ExecutionSolidaryAndEvictionFollowupModalsContainer: React.FC<
    ExecutionSolidaryAndEvictionFollowupModalsContainerProps
> = ({
    showSolidaryCoerciveTargetModal,
    solidaryCoerciveActionPending,
    setShowSolidaryCoerciveTargetModal,
    onCloseSolidaryCoerciveTargetModal,
    setSolidaryCoerciveActionPending,
    EXEC_MODAL_BACKDROP_STRONG,
    nestedOverUnifiedZIndex,
    allDebtorsUnified,
    coerciveSubjectRef,
    saveCoerciveActionRef,
    buildInitialExecutorSeizureDetails,
    setShowCoerciveActionForm,
    showEvictionExpenseModal,
    isEvictionExecutionModule,
    setShowEvictionExpenseModal,
    onCloseEvictionExpenseModal,
    evictionExpensePayMode,
    setEvictionExpensePayMode,
    evictionExpenseAmount,
    setEvictionExpenseAmount,
    evictionExpenseNote,
    setEvictionExpenseNote,
    runEvictionExpenseSubmit,
    showEvictionLawyerFeeModal,
    setShowEvictionLawyerFeeModal,
    onCloseEvictionLawyerFeeModal,
    parsedLawyerFees,
    lawyerFeeDisburseMode,
    setLawyerFeeDisburseMode,
    lawyerFeeDisburseNotes,
    setLawyerFeeDisburseNotes,
    runEvictionLawyerFeeSubmit,
    showEvictionResidentialGraceModal,
    setShowEvictionResidentialGraceModal,
    onCloseEvictionResidentialGraceModal,
    graceModalStartYmd,
    setGraceModalStartYmd,
    graceModalEndYmd,
    setGraceModalEndYmd,
    residentialVacateDeadlineMaxIso,
    residentialGraceModalShowPrimarySave,
    submitEvictionResidentialGraceFromModal,
}) => {
    const closeSolidaryCoerciveTargetModal = () => {
        if (typeof onCloseSolidaryCoerciveTargetModal === 'function') {
            onCloseSolidaryCoerciveTargetModal();
        } else {
            setShowSolidaryCoerciveTargetModal?.(false);
        }
        setSolidaryCoerciveActionPending?.(null);
    };

    const closeEvictionExpenseModal = () => {
        if (typeof onCloseEvictionExpenseModal === 'function') {
            onCloseEvictionExpenseModal();
        } else {
            setShowEvictionExpenseModal?.(false);
        }
    };

    const closeEvictionLawyerFeeModal = () => {
        if (typeof onCloseEvictionLawyerFeeModal === 'function') {
            onCloseEvictionLawyerFeeModal();
        } else {
            setShowEvictionLawyerFeeModal?.(false);
        }
    };

    const closeEvictionResidentialGraceModal = () => {
        if (typeof onCloseEvictionResidentialGraceModal === 'function') {
            onCloseEvictionResidentialGraceModal();
        } else {
            setShowEvictionResidentialGraceModal?.(false);
        }
    };

    return (
        <>
            {showSolidaryCoerciveTargetModal &&
                solidaryCoerciveActionPending &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                        style={{ zIndex: nestedOverUnifiedZIndex }}
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                closeSolidaryCoerciveTargetModal();
                            }
                        }}
                    >
                        <div
                            dir="rtl"
                            className="w-full max-w-md rounded-3xl border-2 border-amber-500/40 bg-[#0B1120] shadow-2xl shadow-black/50"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-label="توجيه الإجراء ضد مدين"
                        >
                            <div className={`flex items-center justify-between border-b border-amber-500/30 p-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                                <button
                                    type="button"
                                    onClick={closeSolidaryCoerciveTargetModal}
                                    className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-amber-500/20`}
                                    aria-label="إغلاق"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                                <h2 className="text-lg font-bold text-amber-400 text-right">توجيه الإجراء ضد من؟</h2>
                            </div>
                            <p className="px-4 pt-3 text-right text-[11px] leading-relaxed text-slate-400">
                                ذمة متضامنة: اختر المدين المستهدف قبل تسجيل الطلب أو المسودة المرسلة لمنفذ العدل.
                            </p>
                            <ul className="max-h-[min(48vh,320px)] space-y-2 overflow-y-auto p-4">
                                {allDebtorsUnified
                                    .filter((r) => !r.cleared)
                                    .map((r) => (
                                        <li key={r.id}>
                                            <button
                                                type="button"
                                                className="w-full rounded-xl border border-slate-600/50 bg-slate-900/60 p-3 text-right text-sm font-semibold text-white transition-all hover:border-amber-500/40 hover:bg-slate-800/80"
                                                onClick={() => {
                                                    const act = solidaryCoerciveActionPending;
                                                    if (!act) return;
                                                    coerciveSubjectRef.current = { id: r.id, name: r.name };
                                                    closeSolidaryCoerciveTargetModal();
                                                    if (['salary', 'property', 'vehicle'].includes(act)) {
                                                        saveCoerciveActionRef.current(
                                                            act,
                                                            buildInitialExecutorSeizureDetails(act)
                                                        );
                                                    } else {
                                                        setShowCoerciveActionForm(act);
                                                    }
                                                }}
                                            >
                                                {r.name}
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>,
                    document.body
                )}

            {showEvictionExpenseModal && isEvictionExecutionModule && (
                <div
                    className={`fixed inset-0 bg-black/90 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                    style={{ zIndex: nestedOverUnifiedZIndex }}
                    onClick={() => closeEvictionExpenseModal()}
                >
                    <div
                        className="bg-[#0B1120] border-2 border-amber-500/40 rounded-3xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`sticky top-0 bg-[#0B1120] border-b border-amber-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                            <button
                                type="button"
                                onClick={() => closeEvictionExpenseModal()}
                                className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-amber-500/20`}
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <h2 className="text-amber-400 font-bold text-lg text-right pr-2">مصاريف إضبارة التخلية</h2>
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
                                    className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl transition-all`}
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
            )}

            {showEvictionLawyerFeeModal && isEvictionExecutionModule && (
                <div
                    className={`fixed inset-0 bg-black/90 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                    style={{ zIndex: nestedOverUnifiedZIndex }}
                    onClick={() => closeEvictionLawyerFeeModal()}
                >
                    <div
                        className="bg-[#0B1120] border-2 border-emerald-500/40 rounded-3xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`sticky top-0 bg-[#0B1120] border-b border-emerald-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                            <button
                                type="button"
                                onClick={() => closeEvictionLawyerFeeModal()}
                                className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-emerald-500/20`}
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <h2 className="text-emerald-400 font-bold text-lg text-right pr-2">طلب صرف أتعاب محكومة</h2>
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
                                    className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl transition-all`}
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
            )}

            {showEvictionResidentialGraceModal &&
                isEvictionExecutionModule &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG} ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                        style={{ zIndex: nestedOverUnifiedZIndex }}
                        onClick={() => closeEvictionResidentialGraceModal()}
                        role="presentation"
                    >
                        <div
                            className="bg-[#0B1120] border-2 border-sky-500/40 rounded-3xl w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`sticky top-0 bg-[#0B1120] border-b border-sky-500/30 p-4 flex justify-between items-center ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                                <button
                                    type="button"
                                    onClick={() => closeEvictionResidentialGraceModal()}
                                    className={`${EXEC_MODAL_CLOSE_BTN_CLASS} hover:bg-sky-500/20`}
                                >
                                    <X size={20} className="text-white" />
                                </button>
                                <h2 className="text-sky-300 font-bold text-lg text-right pr-2">مهلة</h2>
                            </div>
                            <div className="p-5 space-y-4 text-right">
                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-2">
                                        تاريخ بداية المهلة
                                    </label>
                                    <input
                                        type="date"
                                        value={graceModalStartYmd}
                                        onChange={(e) => setGraceModalStartYmd(e.target.value)}
                                        max={graceModalEndYmd || undefined}
                                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm text-right font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-xs font-semibold mb-2">
                                        تاريخ انتهاء المهلة
                                    </label>
                                    <input
                                        type="date"
                                        value={graceModalEndYmd}
                                        onChange={(e) => setGraceModalEndYmd(e.target.value)}
                                        max={residentialVacateDeadlineMaxIso || undefined}
                                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm text-right font-mono"
                                    />
                                </div>
                                {residentialVacateDeadlineMaxIso ? (
                                    <p className="text-[10px] text-slate-500">
                                        أقصى تاريخ مسموح: {residentialVacateDeadlineMaxIso}
                                    </p>
                                ) : null}
                                <div className="rounded-xl border border-sky-500/25 bg-sky-950/25 px-3 py-2 text-sky-100 text-sm">
                                    <p className="text-xs leading-relaxed">
                                        المدة:{' '}
                                        <span className="font-mono font-bold tabular-nums">
                                            {evictionInclusiveCalendarDays(
                                                graceModalStartYmd.trim(),
                                                graceModalEndYmd.trim()
                                            ) || '—'}
                                        </span>{' '}
                                        يوم
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 flex-row-reverse">
                                        {residentialGraceModalShowPrimarySave ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    submitEvictionResidentialGraceFromModal();
                                                }}
                                                className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl transition-all`}
                                            >
                                                حفظ
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => closeEvictionResidentialGraceModal()}
                                            className={`${EXEC_MODAL_TOUCH_TARGET} ${residentialGraceModalShowPrimarySave ? 'flex-1' : 'w-full'} bg-slate-700/60 border border-slate-600/50 text-slate-200 font-semibold py-3 rounded-xl`}
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                    {!residentialGraceModalShowPrimarySave ? (
                                        <p className="text-[10px] text-slate-500 text-right leading-relaxed">
                                            المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة
                                            المهلة بموافقة المنفذ من الإجراءات الميدانية أو بانتهاء تاريخ الانتهاء.
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};
