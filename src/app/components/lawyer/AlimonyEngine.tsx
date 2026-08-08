import React from 'react';
import { motion } from 'motion/react';
import {
    Brain,
    AlertCircle,
    Shield,
    User,
    Lock,
    AlertTriangle,
    Skull,
    CheckCircle
} from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface AlimonyEngineProps {
    debtCategory: 'دين مالي اعتيادي' | 'نفقة شرعية';
    setDebtCategory: (category: 'دين مالي اعتيادي' | 'نفقة شرعية') => void;
    employeeNetSalary: string;
    setEmployeeNetSalary: (value: string) => void;
    continuousAlimony: string;
    setContinuousAlimony: (value: string) => void;
    accumulatedAlimony: string;
    setAccumulatedAlimony: (value: string) => void;
    alimonyClaimMethod: 'دفعة صفقة واحدة' | 'تسوية وتقسيط';
    setAlimonyClaimMethod: (method: 'دفعة صفقة واحدة' | 'تسوية وتقسيط') => void;
    debtorJob?: string;
    debtorName?: string;
    setShowGuarantorModal: (show: boolean) => void;
}

/**
 * 🔥 ALIMONY ENGINE - محرك النفقة الشرعية
 * 
 * Implements 3 critical orders from alimony-engine-logic.md:
 * 1. Debt Classification & Employee Salary Override
 * 2. Strategic Warning Engine (Lump Sum vs Settlement)
 * 3. Payment vs Breach Action Bar (implemented in parent)
 */
export const AlimonyEngine: React.FC<AlimonyEngineProps> = ({
    debtCategory,
    setDebtCategory,
    employeeNetSalary,
    setEmployeeNetSalary,
    continuousAlimony,
    setContinuousAlimony,
    accumulatedAlimony,
    setAccumulatedAlimony,
    alimonyClaimMethod,
    setAlimonyClaimMethod,
    debtorJob,
    debtorName,
    setShowGuarantorModal
}) => {
    
    // Math Engine Logic
    const netSalary = parseFloat(employeeNetSalary.replace(/,/g, '')) || 0;
    const continuous = parseFloat(continuousAlimony.replace(/,/g, '')) || 0;
    const accumulated = parseFloat(accumulatedAlimony.replace(/,/g, '')) || 0;
    const totalRequired = continuous + accumulated;
    const salaryInsufficient = totalRequired > netSalary && netSalary > 0;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1e293b] to-[#172033] border-2 border-indigo-500/30 rounded-xl p-6 space-y-5"
        >
            <h4 className="text-xl font-black text-indigo-300 flex items-center gap-3 mb-4">
                <Brain size={24} className="text-indigo-400" />
                🧠 محرك تصنيف الدين (النفقة الشرعية)
            </h4>
            
            {/* === ORDER 1: DEBT CLASSIFICATION === */}
            <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">📊 تصنيف نوع الدين:</label>
                <div className="grid grid-cols-2 gap-3">
                    <button type="button"
                        onClick={() => setDebtCategory('دين مالي اعتيادي')}
                        className={`p-4 rounded-xl border-2 transition-all text-sm font-bold ${
                            debtCategory === 'دين مالي اعتيادي'
                                ? 'bg-gray-700 border-gray-400 text-white shadow-lg'
                                : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                    >
                        💰 دين مالي اعتيادي
                    </button>
                    <button type="button"
                        onClick={() => setDebtCategory('نفقة شرعية')}
                        className={`p-4 rounded-xl border-2 transition-all text-sm font-bold ${
                            debtCategory === 'نفقة شرعية'
                                ? 'bg-amber-900/50 border-amber-500 text-amber-200 shadow-lg'
                                : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-amber-500/50'
                        }`}
                    >
                        👨‍👩‍👧 نفقة شرعية
                    </button>
                </div>
            </div>
            
            {/* === CONDITIONAL: EMPLOYEE SALARY OVERRIDE (If النفقة الشرعية + موظف) === */}
            {debtCategory === 'نفقة شرعية' && debtorJob === 'موظف' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-amber-950/40 border-2 border-amber-600/50 rounded-xl p-5 space-y-4"
                >
                    <div className="flex items-start gap-3 bg-amber-900/30 p-3 rounded-lg mb-4">
                        <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-200 text-xs leading-relaxed">
                            <span className="font-bold">⚖️ منطق النفقة الخاص:</span> بما أن المدين موظف والدين نفقة شرعية، يجب مقارنة راتبه مع النفقة المطلوبة لتحديد الإجراء القانوني.
                        </p>
                    </div>
                    
                    {/* Employee Net Salary Input */}
                    <div>
                        <label className="block text-sm font-bold text-amber-300 mb-2">
                            💼 مقدار الراتب الصافي للموظف (لغرض المقارنة):
                        </label>
                        <input
                            type="text"
                            value={employeeNetSalary}
                            onChange={(e) => setEmployeeNetSalary(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                            className="w-full bg-[#0f172a] border-2 border-amber-700/50 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-amber-500 outline-none"
                            placeholder="مثال: 850,000"
                        />
                    </div>
                    
                    {/* Continuous Alimony */}
                    <div>
                        <label className="block text-sm font-bold text-emerald-300 mb-2">
                            📅 النفقة المستمرة (شهرياً):
                        </label>
                        <input
                            type="text"
                            value={continuousAlimony}
                            onChange={(e) => setContinuousAlimony(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                            className="w-full bg-[#0f172a] border-2 border-emerald-700/50 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-emerald-500 outline-none"
                            placeholder="مثال: 300,000"
                        />
                    </div>
                    
                    {/* Accumulated Alimony */}
                    <div>
                        <label className="block text-sm font-bold text-rose-300 mb-2">
                            📊 القسط المتراكم:
                        </label>
                        <input
                            type="text"
                            value={accumulatedAlimony}
                            onChange={(e) => setAccumulatedAlimony(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                            className="w-full bg-[#0f172a] border-2 border-rose-700/50 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-rose-500 outline-none"
                            placeholder="مثال: 1,200,000"
                        />
                    </div>
                    
                    {/* === THE MATH ENGINE: Salary Coverage Check === */}
                    {salaryInsufficient && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-rose-950 border-2 border-rose-500 rounded-xl p-5 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-rose-500/10 animate-pulse" />
                            <div className="relative z-10">
                                <div className="flex items-start gap-3 mb-3">
                                    <Shield size={28} className="text-rose-400 flex-shrink-0 animate-pulse" />
                                    <div>
                                        <h5 className="text-rose-200 font-black text-lg mb-2">
                                            ⚠️ الراتب لا يغطي كامل النفقة
                                        </h5>
                                        <p className="text-rose-100/80 text-sm leading-relaxed">
                                            <span className="font-bold">الموظف ملزم قانوناً بتقديم (كفيل ضامن)</span> للمبلغ المتبقي 
                                            <span className="text-rose-300 font-bold"> ({(totalRequired - netSalary).toLocaleString()} د.ع)</span> 
                                            وإلا تعرض للحبس التنفيذي.
                                        </p>
                                        <div className="mt-3 bg-rose-900/50 rounded-lg p-3 text-xs text-rose-200/70">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <p className="text-rose-400 font-bold">الراتب:</p>
                                                    <p>{netSalary.toLocaleString()} د.ع</p>
                                                </div>
                                                <div>
                                                    <p className="text-rose-400 font-bold">المطلوب:</p>
                                                    <p>{totalRequired.toLocaleString()} د.ع</p>
                                                </div>
                                                <div>
                                                    <p className="text-rose-400 font-bold">العجز:</p>
                                                    <p className="text-rose-300 font-black">{(totalRequired - netSalary).toLocaleString()} د.ع</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Auto-Unlock Guarantor & Arrest Options */}
                                <div className="mt-4 pt-4 border-t border-rose-500/30 flex gap-3">
                                    <button type="button"
                                        onClick={() => setShowGuarantorModal(true)}
                                        className="flex-1 bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <User size={18} />
                                        إضافة كفيل ضامن
                                    </button>
                                    <button type="button"
                                        onClick={() => {
                                            SmartToast.warning('سيتم إصدار أمر حبس تنفيذي لعدم كفاية الراتب وعدم تقديم كفيل');
                                        }}
                                        className="flex-1 bg-rose-700 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Lock size={18} />
                                        طلب حبس تنفيذي
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
            
            {/* === ORDER 2: STRATEGIC WARNING ENGINE === */}
            {debtCategory === 'نفقة شرعية' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-teal-950/30 border-2 border-teal-600/40 rounded-xl p-5 space-y-4"
                >
                    <h5 className="text-teal-300 font-bold flex items-center gap-2">
                        <AlertTriangle size={20} />
                        ⚖️ طريقة المطالبة بالنفقة المتراكمة:
                    </h5>
                    
                    {/* Claim Method Toggle */}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button"
                            onClick={() => setAlimonyClaimMethod('دفعة صفقة واحدة')}
                            className={`p-4 rounded-lg border-2 transition-all text-sm font-bold ${
                                alimonyClaimMethod === 'دفعة صفقة واحدة'
                                    ? 'bg-rose-900/50 border-rose-500 text-rose-200'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-rose-500/50'
                            }`}
                        >
                            💥 دفعة صفقة واحدة
                        </button>
                        <button type="button"
                            onClick={() => setAlimonyClaimMethod('تسوية وتقسيط')}
                            className={`p-4 rounded-lg border-2 transition-all text-sm font-bold ${
                                alimonyClaimMethod === 'تسوية وتقسيط'
                                    ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-emerald-500/50'
                            }`}
                        >
                            🤝 تسوية وتقسيط
                        </button>
                    </div>
                    
                    {/* === CRITICAL: STRATEGIC WARNING FOR LUMP SUM === */}
                    {alimonyClaimMethod === 'دفعة صفقة واحدة' && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-rose-950 border-2 border-rose-500 rounded-xl p-6 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-rose-500/10 animate-pulse" />
                            <div className="relative z-10">
                                <div className="flex items-start gap-4">
                                    <div className="bg-rose-500/30 p-3 rounded-xl animate-pulse">
                                        <Skull size={32} className="text-rose-300" />
                                    </div>
                                    <div className="flex-1">
                                        <h6 className="text-rose-200 font-black text-xl mb-3">
                                            🛑 تحذير استراتيجي شديد
                                        </h6>
                                        <p className="text-rose-100/90 text-sm leading-relaxed">
                                            <span className="font-bold">المطالبة بالنفقة المتراكمة كدفعة واحدة وحبس المدين عليها</span> يعني أنه بعد انتهاء مدة الحبس 
                                            <span className="text-rose-300 font-black"> سيُعتبر (عاجزاً قانوناً)</span> عن هذا المبلغ، 
                                            <span className="text-rose-200 font-bold"> ولن تتمكن من حبسه عليه مجدداً!</span>
                                        </p>
                                        <div className="mt-4 bg-rose-900/50 border border-rose-500/30 rounded-lg p-4">
                                            <p className="text-rose-200 text-xs font-bold mb-2">✅ البديل الأفضل:</p>
                                            <p className="text-rose-100/80 text-xs leading-relaxed">
                                                يُنصح بشدة <span className="font-bold">إبرام (تسوية وتقسيط)</span> وطلب <span className="font-bold">(كفيل ضامن)</span> 
                                                لضمان استمرار ورقة الضغط والقدرة على الحبس في حال الإخلال بالتسوية.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    
                    {/* Guarantor Prominence (For Settlement Method) */}
                    {alimonyClaimMethod === 'تسوية وتقسيط' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-teal-900/40 to-cyan-900/40 border-2 border-teal-500/50 rounded-xl p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-teal-500/20 p-2 rounded-lg">
                                    <User size={24} className="text-teal-400" />
                                </div>
                                <div>
                                    <h6 className="text-teal-200 font-bold">🤝 إضافة كفيل ضامن (مُوصى به بشدة)</h6>
                                    <p className="text-teal-300/70 text-xs">لضمان الالتزام بالتسوية والحفاظ على ورقة الضغط</p>
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => setShowGuarantorModal(true)}
                                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-black py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 text-base"
                            >
                                <User size={22} />
                                إضافة كفيل ضامن الآن
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};
