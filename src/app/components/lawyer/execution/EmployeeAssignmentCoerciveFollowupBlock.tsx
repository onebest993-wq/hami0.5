import * as React from 'react';
import type { EmployeeSummonsAssignmentState } from '@/app/types/execution';
import { Send } from 'lucide-react';

export interface EmployeeAssignmentCoerciveFollowupBlockProps {
    assignment: EmployeeSummonsAssignmentState;
    onRequestInvestigation: () => void;
    onRegisterArrestOrder: () => void;
    onRequestForcedBring: () => void;
    /** حالة طلب الإحضار الجبري من قرارات المنفذ (نفس نوع مسار التنفيذ الجبري الشخصي) */
    forcedBringPending?: boolean;
    forcedBringApprovedAwaitingOutcome?: boolean;
    forcedBringRejected?: boolean;
    onWarrantDebtorBrought: () => void;
    onWarrantTerminate: () => void;
    onTerminateAssignment: () => void;
}

/**
 * مسار التكليف بعد عدم الحضور (موظف أو كاسب) — محضر المتابعة، التنفيذ الجبري الشخصي.
 */
export const EmployeeAssignmentCoerciveFollowupBlock: React.FC<
    EmployeeAssignmentCoerciveFollowupBlockProps
> = ({
    assignment,
    onRequestInvestigation,
    onRegisterArrestOrder,
    onRequestForcedBring,
    forcedBringPending = false,
    forcedBringApprovedAwaitingOutcome = false,
    forcedBringRejected = false,
    onWarrantDebtorBrought,
    onWarrantTerminate,
    onTerminateAssignment,
}) => {
    const ph = assignment.phase;
    if (ph === 'none' || ph === 'active') return null;

    type GateKey = 'investigation' | 'forced_bring';
    const [confirming, setConfirming] = React.useState<GateKey | null>(null);
    const [sending, setSending] = React.useState<GateKey | null>(null);

    const renderGate = (key: GateKey, onConfirm: () => void) =>
        confirming === key ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-slate-950/45 px-3 backdrop-blur-xl">
                <button
                    type="button"
                    disabled={sending === key}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (sending === key) return;
                        setSending(key);
                        onConfirm();
                        setSending(null);
                        setConfirming(null);
                    }}
                    className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                >
                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                        <Send size={14} className="text-amber-200" />
                        تأكيد وإرسال للقرارات
                    </span>
                </button>
                <button
                    type="button"
                    disabled={sending === key}
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirming(null);
                    }}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                >
                    إلغاء
                </button>
            </div>
        ) : null;

    return (
        <div className="space-y-4 border-b border-amber-500/20 pb-4 mb-4">
            {ph === 'absent_declared' && (
                <>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setConfirming('investigation')}
                            className="w-full bg-gradient-to-r from-purple-700 to-purple-600 text-white font-bold py-3 rounded-xl"
                        >
                            طلب مفاتحة محكمة التحقيق لإصدار أمر قبض
                        </button>
                        {renderGate('investigation', onRequestInvestigation)}
                    </div>
                    <button
                        type="button"
                        onClick={onTerminateAssignment}
                        className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                    >
                        إنهاء التكليف
                    </button>
                </>
            )}

            {ph === 'investigation_pending' && (
                <p className="text-right text-[11px] font-semibold text-slate-500">قيد البت لدى المنفذ</p>
            )}

            {ph === 'warrant_ui' && (
                <>
                    {!assignment.arrestOrderRecorded ? (
                        <button
                            type="button"
                            onClick={onRegisterArrestOrder}
                            className="w-full bg-gradient-to-r from-violet-700 to-indigo-600 text-white font-bold py-3 rounded-xl"
                        >
                            تسجيل صدور أمر قبض
                        </button>
                    ) : (
                        <>
                            {forcedBringPending ? (
                                <p className="text-right text-[11px] font-semibold text-amber-200/95">
                                    ⏳ طلب إحضار جبري — قيد البت لدى المنفذ
                                </p>
                            ) : forcedBringRejected ? (
                                <p className="text-right text-[11px] font-semibold text-rose-300/95">
                                    رُفض طلب الإحضار الجبري — راجع القرارات أو أعد المحاولة
                                </p>
                            ) : forcedBringApprovedAwaitingOutcome ? (
                                <p className="text-right text-[11px] font-semibold text-emerald-200/90">
                                    وافق المنفذ على الإحضار الجبري — سجّل النتيجة بالأزرار أدناه (نفس أثر محضر
                                    المتابعة).
                                </p>
                            ) : (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setConfirming('forced_bring')}
                                        className="w-full bg-gradient-to-r from-violet-800 to-violet-600 text-white font-bold py-3 rounded-xl"
                                    >
                                        طلب إحضار جبري للمدين
                                    </button>
                                    {renderGate('forced_bring', onRequestForcedBring)}
                                </div>
                            )}
                            {forcedBringApprovedAwaitingOutcome ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={onWarrantDebtorBrought}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3 rounded-xl"
                                    >
                                        تم إحضار المدين
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onWarrantTerminate}
                                        className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                                    >
                                        إنهاء التكليف
                                    </button>
                                </>
                            ) : (
                                <p className="text-right text-[11px] font-semibold text-slate-400/90">
                                    لا يمكن تسجيل النتيجة قبل موافقة المنفذ على طلب الإحضار الجبري.
                                </p>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};
