import React from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ExecutionFile } from '@/app/types/execution';
import { Timer, CheckCircle, Users, AlertTriangle, Shield, Bell, History } from '@/app/components/ui/lucideIcons';

export interface SummonsHistoryRecord {
    date: string;
    state: 'idle' | 'voluntary' | 'forced' | 'arrest' | 'imprisoned' | string;
}

interface PremiumExecutionStepperProps {
    /** يُمرَّر للتوسعة؛ غير مستخدم حالياً داخل المكوّن */
    file: ExecutionFile;
    /** محجوز للعرض المالي لاحقاً */
    baseDebt: number;
    collectionFee: number;
    summonsState: 'idle' | 'voluntary' | 'forced' | 'arrest' | 'imprisoned';
    setSummonsState: (state: 'idle' | 'voluntary' | 'forced' | 'arrest' | 'imprisoned') => void;
    currentSummonsDate: string;
    setCurrentSummonsDate: (date: string) => void;
    summonsHistory: ReadonlyArray<SummonsHistoryRecord>;
}

/**
 * 🏛️ Premium Execution Stepper Component
 * 
 * استبدال جراحي دقيق لقسم "دورة تبليغ وإحضار المدين"
 * يحتوي على:
 * 1. Premium Financial Hero Section (Sticky Banner)
 * 2. 3-Stage Enforcement Stepper
 */
export const PremiumExecutionStepper: React.FC<PremiumExecutionStepperProps> = ({
    file,
    baseDebt,
    collectionFee,
    summonsState,
    setSummonsState,
    currentSummonsDate,
    setCurrentSummonsDate,
    summonsHistory
}) => {
    return (
        <>
            {/* === MINIMALIST DYNAMIC ENFORCEMENT LIFECYCLE === */}
            <div className="w-full bg-slate-900/30 rounded-xl p-6">
                
                {/* ========== STATE A: Waiting for Date Input (idle + no date) ========== */}
                {summonsState === 'idle' && !currentSummonsDate && (
                    <div className="space-y-4">
                        <h3 className="text-white/90 font-semibold text-lg">📋 مذكرة الإخبار بالتنفيذ</h3>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">
                                📅 إدخال تاريخ التبليغ بمذكرة الإخبار
                            </label>
                            <input
                                type="date"
                                value={currentSummonsDate}
                                onChange={(e) => setCurrentSummonsDate(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                )}

                {/* ========== STATE B: Timer Active (idle + date set) ========== */}
                {summonsState === 'idle' && currentSummonsDate && (
                    <div className="space-y-6">
                        <h3 className="text-white/90 font-semibold text-lg">⏳ مهلة التنفيذ الرضائي</h3>
                        
                        {/* Timer Display */}
                        {(() => {
                            const notifDate = new Date(currentSummonsDate);
                            const startDate = new Date(notifDate);
                            startDate.setDate(startDate.getDate() + 1);
                            const today = new Date();
                            const diffTime = startDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            return (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-6 py-4">
                                        <Timer className="text-amber-400" size={28} />
                                        <div className="text-right">
                                            <p className="text-amber-300 font-bold text-2xl">
                                                {diffDays > 0 ? `${diffDays} يوم` : 'انتهت المهلة'}
                                            </p>
                                            <p className="text-amber-200/60 text-xs mt-1">
                                                البدء من اليوم التالي للتبليغ
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Primary Action */}
                        <div className="flex flex-col items-center gap-3">
                            <button type="button"
                                onClick={() => {
                                    setSummonsState('voluntary');
                                }}
                                className="w-full max-w-md py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <CheckCircle size={22} />
                                ✅ المدين حضر وسدد طوعاً
                            </button>
                            
                            {/* Secondary Action - Text Link Style */}
                            <button type="button"
                                onClick={() => setSummonsState('forced')}
                                className="text-slate-400 hover:text-amber-400 text-sm underline transition-colors"
                            >
                                ⏳ إعلان انتهاء المهلة قانونياً
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== STATE C: Grace Period Expired -> Police Stage ========== */}
                {summonsState === 'forced' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-white/90 font-semibold text-xl mb-2">🚨 الإحضار الجبري (بواسطة مركز الشرطة)</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                لانتهاء مهلة الإخبار وعدم حضور المدين، يتم إحضاره مخفوراً بواسطة الشرطة.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button type="button"
                                onClick={() => {
                                    setSummonsState('voluntary');
                                    setCurrentSummonsDate(getLocalTodayYmd());
                                }}
                                className="py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Users size={20} />
                                👮 تم الإحضار والتسوية
                            </button>
                            <button type="button"
                                onClick={() => setSummonsState('arrest')}
                                className="py-4 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={20} />
                                👁️ المدين تخفى عن الأنظار
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== STATE D: Debtor Hid -> Arrest Stage ========== */}
                {summonsState === 'arrest' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-white/90 font-semibold text-xl mb-2">⚖️ مذكرة إلقاء القبض التنفيذية</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                لتخفي المدين عن الأنظار، يتم تعميم مذكرة إلقاء القبض على جميع المنافذ الحدودية ومراكز الشرطة.
                            </p>
                        </div>

                        <button type="button"
                            onClick={() => setSummonsState('imprisoned')}
                            className="w-full py-5 px-6 rounded-xl bg-gradient-to-r from-red-700 to-crimson-700 hover:from-red-800 hover:to-crimson-800 text-white font-bold text-lg transition-all shadow-2xl flex items-center justify-center gap-3"
                        >
                            <Shield size={24} />
                            🔴 إصدار وتعميم أمر القبض
                        </button>
                    </div>
                )}

                {/* ========== FINAL STATE: Case Closed (Voluntary Payment) ========== */}
                {summonsState === 'voluntary' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="text-emerald-400" size={24} />
                            <h3 className="text-emerald-300 font-bold text-lg">
                                ✅ تم إغلاق الإضبارة بنجاح - تنفيذ رضائي
                            </h3>
                        </div>
                        <p className="text-emerald-200/60 text-sm">
                            تاريخ الحضور والتسديد: {currentSummonsDate ? new Date(currentSummonsDate).toLocaleDateString('ar-EG') : '-'}
                        </p>
                    </div>
                )}

                {/* ========== FINAL STATE: Arrest Warrant Issued ========== */}
                {summonsState === 'imprisoned' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Bell className="text-red-400" size={24} />
                            <h3 className="text-red-300 font-bold text-lg">
                                🚨 تم إصدار مذكرة القبض - المدين مطلوب للعدالة
                            </h3>
                        </div>
                        <p className="text-red-200/60 text-sm">
                            المدين محتجز حالياً في الحبس التنفيذي لحين الدفع أو تسوية الدين.
                        </p>
                    </div>
                )}

                {/* ========== HISTORY ARCHIVE (Always Visible if Exists) ========== */}
                {summonsHistory.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-700/50">
                        <h4 className="text-xs text-slate-500 mb-3 flex items-center gap-2 font-semibold uppercase tracking-wider">
                            <History size={14} />
                            أرشيف دورات التبليغ السابقة
                        </h4>
                        <div className="space-y-1.5">
                            {summonsHistory.map((record, idx) => (
                                <div key={idx} className="text-xs text-slate-500 flex items-center gap-2 bg-slate-800/20 rounded px-3 py-1.5">
                                    <span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                                    <span>{record.date}: {record.state === 'voluntary' ? 'حضور طوعي' : record.state === 'forced' ? 'إحضار جبري' : record.state === 'arrest' ? 'أمر قبض' : 'حبس'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
