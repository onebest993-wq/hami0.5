import React from 'react';
import { Car } from '@/app/components/ui/icons/Car';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { CoerciveNoticeLockWarning } from './CoerciveNoticeLockWarning';
import type { CoerciveBranchSharedProps } from './coerciveBranchSharedProps';

export function ExecutionCoerciveMonetaryLimitedBranch({
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    closeCoerciveModal,
}: CoerciveBranchSharedProps) {
    return (
<>
                {daysSinceNoticeCalculated <= 7 && remaining > 0 && (
                    <CoerciveNoticeLockWarning daysSinceNoticeCalculated={daysSinceNoticeCalculated} />
                )}
                <div className="bg-sky-950/30 border border-sky-500/35 rounded-2xl p-3 text-right">
                    <p className="text-sky-200 text-[11px] leading-relaxed">
                        تنفيذ مالي (مدين كاسب): طلبات حجز الراتب أو العقار أو المال المنقول فقط — دون إحضار أو قبض أو سفر أو حبس. القرار لمنفذ العدل (القرارات والطعون).
                    </p>
                </div>
                {activeDebtorIsEmployee && (
                <button
                    type="button"
                    onClick={() => {
                        if (executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)) return;
                        handleCoerciveAction('salary');
                        closeCoerciveModal();
                    }}
                    disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/30 opacity-50 cursor-not-allowed'
                            : 'bg-emerald-950/50 border-emerald-500/50 hover:border-emerald-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <Wallet size={28} className="text-emerald-400" />
                        <div className="text-right">
                            <p className="text-emerald-200 font-bold text-sm mb-1">طلب حجز راتب</p>
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل — راتب أو دخل المدين</p>
                        </div>
                    </div>
                </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        if (executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)) return;
                        handleCoerciveAction('property');
                        closeCoerciveModal();
                    }}
                    disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/30 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-orange-500/30 hover:border-orange-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <FolderOpen size={28} className="text-orange-400" />
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">طلب حجز عقار</p>
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل — منع تصرف</p>
                        </div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)) return;
                        handleCoerciveAction('vehicle');
                        closeCoerciveModal();
                    }}
                    disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/30 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-orange-500/30 hover:border-orange-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <Car size={28} className="text-amber-300" />
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">طلب حجز مال منقول</p>
                            <p className="text-gray-400 text-[10px]">مركبات ومنقولات — طلب لمنفذ العدل</p>
                        </div>
                    </div>
                </button>
            </>
    );
}
