import React from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { TrendingUp } from '@/app/components/ui/icons/TrendingUp';
import { CoerciveNoticeLockWarning } from './CoerciveNoticeLockWarning';
import type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';
import type { CoerciveBranchSharedProps } from './coerciveBranchSharedProps';

type Props = CoerciveBranchSharedProps &
    Pick<
        ExecutionCoerciveActionsModalContainerProps,
        'isDebtorGovernmentEmployee' | 'isDebtorFreelancer' | 'isNonFinancialClaim' | 'showToast'
    >;

export function ExecutionCoerciveStandardBranch({
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    closeCoerciveModal,
    activeDebtorIsEmployee,
    isDebtorGovernmentEmployee,
    isDebtorFreelancer,
    isNonFinancialClaim,
    showToast,
}: Props) {
    return (
<>
        {/* Legal Lock Warning */}
        {daysSinceNoticeCalculated <= 7 && remaining > 0 && (
            <CoerciveNoticeLockWarning daysSinceNoticeCalculated={daysSinceNoticeCalculated} />
        )}
        
        {/* Smart Routing Banner for Government Employees */}
        {daysSinceNoticeCalculated > 7 && isDebtorGovernmentEmployee && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3">
                <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="text-emerald-400 font-bold text-sm">💡 الإجراء الأفضل</span>
                </div>
                <p className="text-gray-300 text-xs text-right mb-2">
                    المدين موظف حكومي - حجز الراتب هو الإجراء الأنسب والأسرع
                </p>
                <p className="text-gray-400 text-[10px] text-right">
                    سيتم إعداد كتاب رسمي إلى جهة العمل تلقائياً
                </p>
            </div>
        )}
        
        {/* Smart Routing Banner for Freelancers */}
        {daysSinceNoticeCalculated > 7 && isDebtorFreelancer && (
            <div className="bg-purple-950/30 border border-purple-500/40 rounded-2xl p-3">
                <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="text-purple-400 font-bold text-sm">💡 الإجراء الأفضل</span>
                </div>
                <p className="text-gray-300 text-xs text-right mb-2">
                    طلبات الحجز المالية أعلاه تُعرَض على منفذ العدل؛ الإحضار الجبري والمفاتحة وطلب الكفيل وغيرها من تبويب «التنفيذ الجبري الشخصي» في محضر المتابعة (لجميع مسارات الإضبارة).
                </p>
                <p className="text-gray-400 text-[10px] text-right">
                    طلبات الحجز المالية تُعرَض على منفذ العدل وتُسجَّل في «القرارات والطعون».
                </p>
            </div>
        )}
        
        {/* Financial Coercive Actions */}
        {!isNonFinancialClaim && (
            <>
                <button
                    type="button"
                    disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                    onClick={() => {
                        if (daysSinceNoticeCalculated <= 7 && remaining > 0) return;
                        if (!activeDebtorIsEmployee) {
                            showToast('حجز الراتب متاح للمدين الموظف فقط.', 'info');
                            return;
                        }
                        handleCoerciveAction('salary');
                        closeCoerciveModal();
                    }}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                            : isDebtorGovernmentEmployee
                            ? 'bg-emerald-950/40 border-emerald-500/60 hover:border-emerald-400 animate-pulse'
                            : 'bg-slate-900/40 border-amber-500/30 hover:border-amber-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={24} className={isDebtorGovernmentEmployee ? 'text-emerald-400' : 'text-amber-400'} />
                            {isDebtorGovernmentEmployee && (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    الأفضل
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            <p className={`font-bold text-sm mb-1 ${isDebtorGovernmentEmployee ? 'text-emerald-300' : 'text-white'}`}>
                                📋 طلب حجز راتب
                            </p>
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل — موظفون</p>
                        </div>
                    </div>
                </button>
                
                <button
                    type="button"
                    disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                    onClick={() => {
                        if (daysSinceNoticeCalculated <= 7 && remaining > 0) return;
                        handleCoerciveAction('vehicle');
                        closeCoerciveModal();
                    }}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-orange-500/30 hover:border-orange-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="text-orange-400 text-2xl">🚗</div>
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">طلب حجز مال منقول</p>
                            <p className="text-gray-400 text-[10px]">مركبات ومنقولات — لمنفذ العدل</p>
                        </div>
                    </div>
                </button>
                
                <button
                    type="button"
                    disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                    onClick={() => {
                        if (daysSinceNoticeCalculated <= 7 && remaining > 0) return;
                        handleCoerciveAction('property');
                        closeCoerciveModal();
                    }}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        (daysSinceNoticeCalculated <= 7 && remaining > 0)
                            ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-orange-500/30 hover:border-orange-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="text-orange-400 text-2xl">🏠</div>
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">طلب حجز عقار</p>
                            <p className="text-gray-400 text-[10px]">طلب لمنفذ العدل — عقار/أرض</p>
                        </div>
                    </div>
                </button>
            </>
        )}

        {/* Non-Financial Actions */}
        {isNonFinancialClaim && (
            <>
                <button
                    type="button"
                    disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                    onClick={() => {
                        if (daysSinceNoticeCalculated <= 7 && remaining > 0) return;
                        handleCoerciveAction('police_force');
                        closeCoerciveModal();
                    }}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        daysSinceNoticeCalculated <= 7 && remaining > 0
                            ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-indigo-500/30 hover:border-indigo-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="text-indigo-400 text-2xl">👮</div>
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">طلب قوة تنفيذية</p>
                            <p className="text-gray-400 text-[10px]">طلب مساعدة الشرطة</p>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                    onClick={() => {
                        if (daysSinceNoticeCalculated <= 7 && remaining > 0) return;
                        handleCoerciveAction('refusal_record');
                        closeCoerciveModal();
                    }}
                    className={`w-full border rounded-2xl p-3 transition-all text-right ${
                        daysSinceNoticeCalculated <= 7 && remaining > 0
                            ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/40 border-rose-500/30 hover:border-rose-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <FileText size={24} className="text-rose-400" />
                        <div className="text-right">
                            <p className="text-white font-bold text-sm mb-1">محضر امتناع</p>
                            <p className="text-gray-400 text-[10px]">تنظيم محضر رسمي</p>
                        </div>
                    </div>
                </button>
            </>
        )}
            </>
    );
}
