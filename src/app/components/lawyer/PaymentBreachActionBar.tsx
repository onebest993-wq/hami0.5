import React from 'react';
import { motion } from 'motion/react';
import {
    CheckCircle,
    AlertTriangle,
    User,
    Lock,
    Shield
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface PaymentBreachActionBarProps {
    debtCategory: 'دين مالي اعتيادي' | 'نفقة شرعية';
    settlementActive: boolean;
    guarantorName?: string;
    guarantorWorkplace?: string;
    employeeNetSalary?: string;
    continuousAlimony?: string;
    accumulatedAlimony?: string;
    onPaymentLogged: () => void;
    onBreachDetected: () => void;
}

/**
 * 🔥 ORDER 3: PAYMENT VS BREACH ACTION BAR
 * 
 * Binary decision system for tracking settlement/alimony payments.
 * Shows enforcement options based on breach conditions.
 */
export const PaymentBreachActionBar: React.FC<PaymentBreachActionBarProps> = ({
    debtCategory,
    settlementActive,
    guarantorName,
    guarantorWorkplace,
    employeeNetSalary,
    continuousAlimony,
    accumulatedAlimony,
    onPaymentLogged,
    onBreachDetected
}) => {
    const [showBreachActions, setShowBreachActions] = React.useState(false);
    
    // Calculate if employee salary doesn't cover alimony
    const netSalary = parseFloat(employeeNetSalary?.replace(/,/g, '') || '0');
    const continuous = parseFloat(continuousAlimony?.replace(/,/g, '') || '0');
    const accumulated = parseFloat(accumulatedAlimony?.replace(/,/g, '') || '0');
    const totalRequired = continuous + accumulated;
    const salaryInsufficient = totalRequired > netSalary && netSalary > 0;
    
    const handlePayment = () => {
        onPaymentLogged();
        setShowBreachActions(false);
    };
    
    const handleBreach = () => {
        setShowBreachActions(true);
        onBreachDetected();
    };
    
    if (!settlementActive && debtCategory !== 'نفقة شرعية') {
        return null;
    }
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-cyan-500/30 rounded-xl p-6 space-y-5"
        >
            <h4 className="text-xl font-black text-cyan-300 flex items-center gap-3 mb-4">
                <Shield size={24} className="text-cyan-400" />
                ⚡ رادار التسديد والإخلال
            </h4>
            
            <div className="bg-cyan-950/20 border border-cyan-700/30 rounded-lg p-4 mb-4">
                <p className="text-cyan-200/80 text-sm leading-relaxed">
                    <span className="font-bold">نظام القرار الثنائي:</span> اختر الإجراء المناسب للفترة الحالية بناءً على التزام المدين.
                </p>
            </div>
            
            {/* === THE BINARY ACTION BAR === */}
            <div className="grid grid-cols-2 gap-4">
                {/* Button A: Payment Received */}
                <button type="button"
                    onClick={handlePayment}
                    className="group relative overflow-hidden bg-gradient-to-br from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-black py-6 rounded-xl transition-all shadow-xl border-2 border-emerald-500/50"
                >
                    <div className="absolute inset-0 bg-emerald-400/10 group-hover:bg-emerald-400/20 transition-colors" />
                    <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                        <CheckCircle size={40} className="animate-pulse" />
                        <span className="text-lg">✅ تم تسديد الدفعة الحالية</span>
                    </div>
                </button>
                
                {/* Button B: Breach Detected */}
                <button type="button"
                    onClick={handleBreach}
                    className="group relative overflow-hidden bg-gradient-to-br from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 text-white font-black py-6 rounded-xl transition-all shadow-xl border-2 border-rose-500/50"
                >
                    <div className="absolute inset-0 bg-rose-400/10 group-hover:bg-rose-400/20 transition-colors animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                        <AlertTriangle size={40} className="animate-pulse" />
                        <span className="text-lg">❌ المدين أخلّ بالدفع</span>
                    </div>
                </button>
            </div>
            
            {/* === THE BREACH CONSEQUENCE ENGINE (MORPHING UI) === */}
            {showBreachActions && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-rose-950/50 border-2 border-rose-500 rounded-xl p-6 space-y-4"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-rose-500/20 p-3 rounded-xl">
                            <AlertTriangle size={28} className="text-rose-400 animate-pulse" />
                        </div>
                        <div>
                            <h5 className="text-rose-200 font-black text-lg">
                                ⚖️ إجراءات الإخلال بالتسوية / النفقة
                            </h5>
                            <p className="text-rose-200/70 text-xs mt-1">
                                اختر الإجراء القانوني المناسب حسب الحالة
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Condition A: If Guarantor Exists */}
                        {guarantorName && (
                            <button type="button"
                                onClick={() => {
                                    SmartToast.info(`سيتم إصدار أمر بإحضار المدين والكفيل الضامن جبراً — الكفيل: ${guarantorName}`);
                                }}
                                className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <User size={22} />
                                🚨 طلب إحضار المدين والكفيل الضامن جبراً
                            </button>
                        )}
                        
                        {/* Condition B: If No Guarantor & Debt is Alimony */}
                        {!guarantorName && debtCategory === 'نفقة شرعية' && (
                            <button type="button"
                                onClick={() => {
                                    SmartToast.warning('سيتم إيقاع الحبس التنفيذي للامتناع عن تسديد النفقة');
                                }}
                                className="w-full bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <Lock size={22} />
                                🔒 إيقاع الحبس التنفيذي للامتناع عن تسديد النفقة
                            </button>
                        )}
                        
                        {/* Condition C: If Employee & Salary Doesn't Cover & No Guarantor */}
                        {!guarantorName && debtCategory === 'نفقة شرعية' && salaryInsufficient && (
                            <button type="button"
                                onClick={() => {
                                    SmartToast.warning('سيتم إصدار تعميم أمر قبض لعدم كفاية الراتب وعدم وجود كفيل');
                                }}
                                className="w-full bg-gradient-to-r from-red-800 to-rose-900 hover:from-red-700 hover:to-rose-800 text-white font-bold py-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3 border-2 border-rose-500/50"
                            >
                                <Shield size={22} className="animate-pulse" />
                                👮 تعميم أمر قبض لعدم كفاية الراتب وعدم وجود كفيل
                            </button>
                        )}
                        
                        {/* Default: General Breach Action */}
                        {!guarantorName && debtCategory !== 'نفقة شرعية' && (
                            <button type="button"
                                onClick={() => {
                                    SmartToast.info('سيتم طلب إحضار المدين لمخالفة شروط التسوية');
                                }}
                                className="w-full bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-3"
                            >
                                <AlertTriangle size={22} />
                                ⚠️ طلب إحضار المدين لمخالفة التسوية
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-rose-500/30">
                        <button type="button"
                            onClick={() => setShowBreachActions(false)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                        >
                            إلغاء
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
