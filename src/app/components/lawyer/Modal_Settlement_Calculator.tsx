import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Handshake, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface SettlementCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    currentTotal: number;
    onSettlement: (downPayment: number, monthlyInstallment: number) => void;
}

export const SettlementCalculator = React.memo<SettlementCalculatorProps>(({
    isOpen,
    onClose,
    currentTotal,
    onSettlement
}) => {
    const [downPayment, setDownPayment] = useState<string>('');
    const [monthlyInstallment, setMonthlyInstallment] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = useCallback(() => {
        const numDownPayment = parseFloat(downPayment);
        const numMonthly = parseFloat(monthlyInstallment);
        
        if (!downPayment || isNaN(numDownPayment)) {
            setError('يجب إدخال الدفعة المقدمة');
            return;
        }
        
        if (!monthlyInstallment || isNaN(numMonthly)) {
            setError('يجب إدخال القسط الشهري');
            return;
        }
        
        if (numDownPayment <= 0 || numMonthly <= 0) {
            setError('جميع المبالغ يجب أن تكون أكبر من صفر');
            return;
        }
        
        if (numDownPayment >= currentTotal) {
            setError('الدفعة المقدمة يجب أن تكون أقل من المبلغ الكلي');
            return;
        }
        
        onSettlement(numDownPayment, numMonthly);
        setDownPayment('');
        setMonthlyInstallment('');
        setError('');
        onClose();
    }, [downPayment, monthlyInstallment, currentTotal, onSettlement, onClose]);

    const formatNumber = useCallback((num: number) => {
        return num.toLocaleString('ar-IQ');
    }, []);
    
    const handleDownPaymentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setDownPayment(e.target.value);
        setError('');
    }, []);
    
    const handleMonthlyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMonthlyInstallment(e.target.value);
        setError('');
    }, []);
    
    // Calculate remaining and months needed
    const calculation = useMemo(() => {
        const numDownPayment = parseFloat(downPayment);
        const numMonthly = parseFloat(monthlyInstallment);
        
        if (isNaN(numDownPayment) || isNaN(numMonthly) || numDownPayment <= 0 || numMonthly <= 0) {
            return null;
        }
        
        const remaining = currentTotal - numDownPayment;
        const monthsNeeded = Math.ceil(remaining / numMonthly);
        
        return {
            remaining,
            monthsNeeded,
        };
    }, [downPayment, monthlyInstallment, currentTotal]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0B1120] border-2 border-blue-500/40 rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-blue-500/30 p-4 flex justify-between items-center z-10">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-blue-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-blue-400 font-bold text-lg flex items-center gap-2">
                        <Handshake size={20} />
                        📅 تسوية وتقسيط
                    </h2>
                </div>

                {/* CONTENT */}
                <div className="p-6 space-y-5">
                    {/* Current Total Display */}
                    <div className="bg-slate-900/40 border border-amber-500/30 rounded-xl p-4">
                        <p className="text-gray-400 text-xs text-right mb-2">إجمالي المطلوب</p>
                        <p className="text-amber-400 font-black text-3xl text-right">
                            {formatNumber(currentTotal)}
                        </p>
                        <p className="text-gray-500 text-[10px] text-right mt-1">دينار عراقي</p>
                    </div>

                    {/* Down Payment Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                            الدفعة المقدمة
                        </label>
                        <input
                            type="number"
                            value={downPayment}
                            onChange={handleDownPaymentChange}
                            placeholder="مثال: 1000000"
                            className="w-full bg-slate-800/50 border border-blue-500/30 rounded-xl px-4 py-3 text-white text-right text-lg font-bold focus:border-blue-400 focus:outline-none"
                            dir="rtl"
                        />
                    </div>

                    {/* Monthly Installment Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                            القسط الشهري
                        </label>
                        <input
                            type="number"
                            value={monthlyInstallment}
                            onChange={handleMonthlyChange}
                            placeholder="مثال: 500000"
                            className="w-full bg-slate-800/50 border border-blue-500/30 rounded-xl px-4 py-3 text-white text-right text-lg font-bold focus:border-blue-400 focus:outline-none"
                            dir="rtl"
                        />
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-end gap-2 text-rose-400 text-xs bg-rose-950/20 border border-rose-500/30 rounded-lg p-3"
                        >
                            <span>{error}</span>
                            <AlertCircle size={14} />
                        </motion.div>
                    )}

                    {/* Preview Calculation */}
                    {calculation && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-blue-950/30 border border-blue-500/40 rounded-xl p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-emerald-400 font-bold">{formatNumber(parseFloat(downPayment))}</span>
                                <span className="text-gray-300">الدفعة المقدمة</span>
                            </div>
                            
                            <div className="h-px bg-gradient-to-r from-transparent via-blue-600 to-transparent"></div>
                            
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 font-bold">{formatNumber(calculation.remaining)}</span>
                                <span className="text-gray-300">المتبقي بعد الدفعة</span>
                            </div>
                            
                            <div className="h-px bg-gradient-to-r from-transparent via-blue-600 to-transparent"></div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-400" />
                                    <span className="text-indigo-400 font-black text-xl">{calculation.monthsNeeded}</span>
                                </div>
                                <span className="text-gray-400 text-xs">عدد الأقساط المتوقعة</span>
                            </div>
                            
                            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3 mt-3">
                                <p className="text-indigo-300 text-xs text-right flex items-center justify-end gap-2">
                                    <span>⚖️ ستوقف الإجراءات الجبرية طالما الأقساط منتظمة</span>
                                    <CheckCircle size={14} />
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Submit Button */}
                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!downPayment || !monthlyInstallment || parseFloat(downPayment) <= 0 || parseFloat(monthlyInstallment) <= 0}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        إبرام التسوية
                    </button>
                </div>
            </motion.div>
        </div>
    );
});