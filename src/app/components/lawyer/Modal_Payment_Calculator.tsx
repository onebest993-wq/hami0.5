import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, DollarSign, CheckCircle, AlertCircle } from '@/app/components/ui/lucideIcons';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';

interface PaymentCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    currentTotal: number;
    onPayment: (amount: number) => void;
}

export const PaymentCalculator = React.memo<PaymentCalculatorProps>(({
    isOpen,
    onClose,
    currentTotal,
    onPayment
}) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = useCallback(() => {
        const numAmount = parseFloat(amount);
        
        if (!amount || isNaN(numAmount)) {
            setError('يجب إدخال مبلغ صحيح');
            return;
        }
        
        if (numAmount <= 0) {
            setError('المبلغ يجب أن يكون أكبر من صفر');
            return;
        }
        
        if (numAmount > currentTotal) {
            setError('المبلغ المدخل أكبر من المطلوب');
            return;
        }
        
        onPayment(numAmount);
        setAmount('');
        setError('');
        onClose();
    }, [amount, currentTotal, onPayment, onClose]);

    const formatNumber = useCallback((num: number) => {
        return num.toLocaleString('ar-IQ');
    }, []);
    
    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value);
        setError('');
    }, []);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0B1120] border-2 border-emerald-500/40 rounded-3xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-b border-emerald-500/30 p-4 flex justify-between items-center">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-emerald-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                        <DollarSign size={20} />
                        💵 سداد دفعة
                    </h2>
                </div>

                {/* CONTENT */}
                <div className="p-6 space-y-5">
                    {/* Current Total Display */}
                    <div className="bg-slate-900/40 border border-amber-500/30 rounded-xl p-4">
                        <p className="text-gray-400 text-xs text-right mb-2">إجمالي المطلوب الحالي</p>
                        <p className="text-amber-400 font-black text-3xl text-right">
                            {formatNumber(currentTotal)}
                        </p>
                        <p className="text-gray-500 text-[10px] text-right mt-1">دينار عراقي</p>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 text-right">
                            أدخل مبلغ السداد المدفوع
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="مثال: 2000000"
                            className="w-full bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-white text-right text-lg font-bold focus:border-emerald-400 focus:outline-none"
                            dir="rtl"
                        />
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 flex items-center justify-end gap-2 text-rose-400 text-xs"
                            >
                                <span>{error}</span>
                                <AlertCircle size={14} />
                            </motion.div>
                        )}
                    </div>

                    {/* Preview Calculation */}
                    {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && parseFloat(amount) <= currentTotal && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-2"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-emerald-400 font-bold">{formatNumber(parseFloat(amount))}</span>
                                <span className="text-gray-300">المبلغ المدفوع</span>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-amber-400 font-black text-xl">
                                    {formatNumber(currentTotal - parseFloat(amount))}
                                </span>
                                <span className="text-gray-400 text-xs">المتبقي بعد السداد</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Submit Button */}
                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} />
                        تأكيد السداد
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
});