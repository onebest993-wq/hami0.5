import React from 'react';
import { Car, FileText, FolderOpen, Gavel, Lock, TrendingUp, Wallet, X } from 'lucide-react';

export interface ExecutionCoerciveActionsModalContainerProps {
    showCoerciveModal: boolean;
    setShowCoerciveModal: (show: boolean) => void;
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    followupMonetaryCoerciveLimitedOnly: boolean;
    activeDebtorIsEmployee: boolean;
    executionCoerciveButtonDisabled: boolean;
    daysSinceNoticeCalculated: number;
    remaining: number;
    handleCoerciveAction: (actionType: string) => void;
    isDebtorGovernmentEmployee: boolean;
    isDebtorFreelancer: boolean;
    isNonFinancialClaim: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ExecutionCoerciveActionsModalContainer: React.FC<ExecutionCoerciveActionsModalContainerProps> = ({
    showCoerciveModal,
    setShowCoerciveModal,
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    isDebtorGovernmentEmployee,
    isDebtorFreelancer,
    isNonFinancialClaim,
    showToast,
}) => {
    if (!showCoerciveModal) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShowCoerciveModal(false)}>
            <div className="bg-[#0B1120] border-2 border-rose-500/40 rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#0B1120] border-b border-rose-500/30 p-4 flex justify-between items-center z-10">
                    <button type="button" onClick={() => setShowCoerciveModal(false)} className="p-2 hover:bg-rose-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-rose-400 font-bold text-lg flex items-center gap-2">
                        <Gavel size={20} />
                        {followupEmployeeFinancialSalaryOnlyCoercive
                            ? 'طلبات حجز — تنفيذ مالي (موظف)'
                            : followupMonetaryCoerciveLimitedOnly
                              ? 'طلبات حجز مال — راتب وعقار ومنقول'
                              : 'التنفيذ الجبري والإكراه'}
                    </h2>
                </div>
                
                <div className="p-5 space-y-3">
                    {followupEmployeeFinancialSalaryOnlyCoercive ? (
                        <>
                            <div className="backdrop-blur-xl bg-amber-950/35 border border-amber-500/40 rounded-2xl p-4 text-right">
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
                                    executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)
                                        ? 'bg-slate-900/20 border-gray-700/30 opacity-50 cursor-not-allowed'
                                        : 'bg-emerald-950/50 border-emerald-500/50 hover:border-emerald-400 shadow-lg shadow-emerald-900/20'
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                    ) : followupMonetaryCoerciveLimitedOnly ? (
                        <>
                            {daysSinceNoticeCalculated <= 7 && remaining > 0 && (
                                <div className="backdrop-blur-xl bg-slate-800/60 border-2 border-amber-500/40 rounded-2xl p-5 text-center">
                                    <Lock size={40} className="text-amber-400 mx-auto mb-3" />
                                    <h4 className="text-amber-400 font-bold text-sm mb-2">
                                        🔒 الإجراءات الجبرية مقفلة قانوناً
                                    </h4>
                                    <p className="text-gray-400 text-xs mb-3">
                                        يرجى انتظار انتهاء فترة الإخبار (7 أيام) أو إخلال المدين بالتسوية
                                    </p>
                                    <div className="text-amber-300 font-bold text-lg">
                                        {Math.max(0, 7 - daysSinceNoticeCalculated)} أيام متبقية (تقديري)
                                    </div>
                                </div>
                            )}
                            <div className="backdrop-blur-xl bg-sky-950/30 border border-sky-500/35 rounded-2xl p-4 text-right">
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                                    setShowCoerciveModal(false);
                                }}
                                disabled={executionCoerciveButtonDisabled || (daysSinceNoticeCalculated <= 7 && remaining > 0)}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                    ) : (
                        <>
                    {/* Legal Lock Warning */}
                    {daysSinceNoticeCalculated <= 7 && remaining > 0 && (
                        <div className="backdrop-blur-xl bg-slate-800/60 border-2 border-amber-500/40 rounded-2xl p-5 text-center">
                            <Lock size={40} className="text-amber-400 mx-auto mb-3" />
                            <h4 className="text-amber-400 font-bold text-sm mb-2">
                                🔒 الإجراءات الجبرية مقفلة قانوناً
                            </h4>
                            <p className="text-gray-400 text-xs mb-3">
                                يرجى انتظار انتهاء فترة الإخبار (7 أيام) أو إخلال المدين بالتسوية
                            </p>
                            <div className="text-amber-300 font-bold text-lg">
                                {Math.max(0, 7 - daysSinceNoticeCalculated)} أيام متبقية (تقديري)
                            </div>
                        </div>
                    )}
                    
                    {/* Smart Routing Banner for Government Employees */}
                    {daysSinceNoticeCalculated > 7 && isDebtorGovernmentEmployee && (
                        <div className="backdrop-blur-xl bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-4">
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
                        <div className="backdrop-blur-xl bg-purple-950/30 border-2 border-purple-500/40 rounded-2xl p-4">
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
                                    setShowCoerciveModal(false);
                                }}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
                                    (daysSinceNoticeCalculated <= 7 && remaining > 0)
                                        ? 'bg-slate-900/20 border-gray-700/20 opacity-50 cursor-not-allowed'
                                        : isDebtorGovernmentEmployee
                                        ? 'bg-emerald-950/40 border-emerald-500/60 hover:border-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse'
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
                                    setShowCoerciveModal(false);
                                }}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                                    setShowCoerciveModal(false);
                                }}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
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
                            <button type="button"
                                disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
                                    (daysSinceNoticeCalculated <= 7 && remaining > 0)
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
                            
                            <button type="button"
                                disabled={daysSinceNoticeCalculated <= 7 && remaining > 0}
                                className={`w-full backdrop-blur-xl border rounded-2xl p-4 transition-all text-right ${
                                    (daysSinceNoticeCalculated <= 7 && remaining > 0)
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
                    )}
                </div>
            </div>
        </div>
    );
};
