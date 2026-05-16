import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, CheckCircle, DollarSign, Users } from 'lucide-react';

interface AlimonyFinancialBlockProps {
    // Past/Accumulated Alimony
    pastWifeAlimony: number;
    pastChildrenAlimony: number;
    totalPastAlimony: number;
    
    // Continuous Monthly Alimony
    wifeMonthlyAlimony: number;
    childrenMonthlyAlimony: number;
    childrenCount: number;
    totalMonthlyAlimony: number;
    
    // Cycle Tracker
    daysRemainingInCycle?: number;
}

export const AlimonyFinancialBlock = React.memo<AlimonyFinancialBlockProps>((props) => {
    const {
        pastWifeAlimony,
        pastChildrenAlimony,
        totalPastAlimony,
        wifeMonthlyAlimony,
        childrenMonthlyAlimony,
        childrenCount,
        totalMonthlyAlimony,
        daysRemainingInCycle = 15
    } = props;
    
    const formatCurrency = React.useCallback((amount: number) => {
        return amount.toLocaleString('ar-IQ');
    }, []);

    return (
        <div className="space-y-4">
            {/* 🆕 V20: CARD A - CONTINUOUS MONTHLY ALIMONY (النفقة المستمرة) - PRIORITY #1 */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="backdrop-blur-xl bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3"
            >
                <div className="flex items-center justify-end gap-2 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent"></div>
                    <div className="relative">
                        <Clock size={16} className="text-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                    <h4 className="text-emerald-400 font-bold text-sm">النفقة المستمرة</h4>
                </div>
                
                {wifeMonthlyAlimony > 0 && (
                    <div className="flex items-center justify-between bg-slate-900/40 border border-emerald-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-300 font-bold text-base">
                                {formatCurrency(wifeMonthlyAlimony)}
                            </span>
                            <span className="text-emerald-500/70 text-[10px]">/ شهرياً</span>
                        </div>
                        <span className="text-gray-300 text-xs">استحقاق الزوجة</span>
                    </div>
                )}
                
                {childrenMonthlyAlimony > 0 && (
                    <div className="flex items-center justify-between bg-slate-900/40 border border-emerald-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-300 font-bold text-base">
                                {formatCurrency(childrenMonthlyAlimony * childrenCount)}
                            </span>
                            <span className="text-emerald-500/70 text-[10px]">/ شهرياً</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-xs">استحقاق الأولاد</span>
                            <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-400/30 rounded px-2 py-0.5">
                                <Users size={10} className="text-purple-300" />
                                <span className="text-purple-300 text-[10px] font-bold">{childrenCount}</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
                
                <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black text-xl">
                            {formatCurrency(totalMonthlyAlimony)}
                        </span>
                        <span className="text-emerald-500/70 text-xs">د.ع</span>
                    </div>
                    <span className="text-emerald-300 text-sm font-semibold">الإجمالي الشهري المطلوب</span>
                </div>
                
                {/* DYNAMIC CYCLE TRACKER */}
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-indigo-400 font-bold text-sm">{daysRemainingInCycle}</span>
                            <span className="text-indigo-500/70 text-[10px]">يوم متبقي</span>
                        </div>
                        <Clock size={12} className="text-indigo-400" />
                        <span className="text-indigo-300 text-xs">دورة الاستحقاق الحالية:</span>
                    </div>
                </div>
            </motion.div>
            
            {/* 🆕 V20: CARD B - ACCUMULATED ALIMONY (المبلغ المتراكم الماضي) - PRIORITY #2 */}
            {totalPastAlimony > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="backdrop-blur-xl bg-rose-950/30 border-2 border-rose-500/40 rounded-2xl p-4 space-y-3"
                >
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <div className="h-px flex-1 bg-gradient-to-l from-rose-500/30 to-transparent"></div>
                        <Calendar size={16} className="text-rose-400" />
                        <h4 className="text-rose-400 font-bold text-sm">المبلغ المتراكم الماضي</h4>
                    </div>
                    
                    {pastWifeAlimony > 0 && (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-rose-500/20 rounded-lg p-2.5">
                            <span className="text-rose-300 font-bold text-base">
                                {formatCurrency(pastWifeAlimony)}
                            </span>
                            <span className="text-gray-300 text-xs">نفقة زوجة ماضية</span>
                        </div>
                    )}
                    
                    {pastChildrenAlimony > 0 && (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-rose-500/20 rounded-lg p-2.5">
                            <span className="text-rose-300 font-bold text-base">
                                {formatCurrency(pastChildrenAlimony)}
                            </span>
                            <span className="text-gray-300 text-xs">نفقة أولاد ماضية</span>
                        </div>
                    )}
                    
                    <div className="h-px bg-gradient-to-r from-transparent via-rose-600 to-transparent"></div>
                    
                    <div className="flex items-center justify-between bg-rose-900/30 border border-rose-500/30 rounded-lg p-3">
                        <span className="text-rose-400 font-black text-xl">
                            {formatCurrency(totalPastAlimony)}
                        </span>
                        <span className="text-rose-300 text-sm font-semibold">المجموع المتراكم</span>
                    </div>
                </motion.div>
            )}
            
            {/* 🆕 V20: BADGES - معفى من رسوم التنفيذ + القانون العراقي */}
            <div className="flex flex-col gap-2">
                <div className="backdrop-blur-xl bg-blue-950/30 border border-blue-500/40 rounded-xl p-3">
                    <div className="flex items-center justify-end gap-2">
                        <CheckCircle size={16} className="text-blue-400" />
                        <p className="text-blue-300 text-xs font-semibold">معفى من رسوم التنفيذ</p>
                    </div>
                </div>
                
                <div className="backdrop-blur-xl bg-purple-950/30 border border-purple-500/40 rounded-xl p-3">
                    <div className="flex items-center justify-end gap-2">
                        <DollarSign size={16} className="text-purple-400" />
                        <p className="text-purple-300 text-xs font-semibold">⚖️ القانون العراقي للنفقة</p>
                    </div>
                </div>
            </div>
        </div>
    );
});