import React from 'react';
import { Car } from '@/app/components/ui/icons/Car';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import type { CoerciveBranchSharedProps } from './coerciveBranchSharedProps';

export function ExecutionCoerciveEmployeeSalaryOnlyBranch({
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    closeCoerciveModal,
}: CoerciveBranchSharedProps) {
    return (
<>
                <div className="bg-amber-950/35 border border-amber-500/40 rounded-2xl p-3 text-right">
                    <p className="text-amber-200 text-xs font-bold mb-2">مسار الموظف في الدين المالي</p>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                        لا إحضار جبري ولا قبض. طلب حجز راتب (١/٥) أو عقار أو مال منقول لمنفذ العدل — سجِّل القرار في «القرارات والطعون».
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
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
                            <p className="text-emerald-200 font-bold text-sm mb-1">طلب حجز راتب (١/٥)</p>
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل</p>
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
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل</p>
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
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل</p>
                        </div>
                    </div>
                </button>
                </div>
            </>
    );
}
