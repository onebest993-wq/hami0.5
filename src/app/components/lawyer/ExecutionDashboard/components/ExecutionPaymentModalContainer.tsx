import React from 'react';
import { motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { X } from 'lucide-react';

export interface ExecutionPaymentModalContainerProps {
    showPaymentModal: boolean;
    setShowPaymentModal: (show: boolean) => void;
    paymentAmount: string;
    setPaymentAmount: Dispatch<SetStateAction<string>>;
    handlePayment: () => void;
}

export const ExecutionPaymentModalContainer: React.FC<ExecutionPaymentModalContainerProps> = ({
    showPaymentModal,
    setShowPaymentModal,
    paymentAmount,
    setPaymentAmount,
    handlePayment,
}) => {
    if (!showPaymentModal) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0F172A] border border-gray-700 rounded-2xl p-6 max-w-lg w-full"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">تسجيل دفعة جديدة</h3>
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">المبلغ المدفوع (د.ع)</label>
                        <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-2xl text-center"
                        />
                    </div>
                </div>
                <button type="button"
                    onClick={handlePayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                >
                    تأكيد الدفعة
                </button>
            </motion.div>
        </div>
    );
};
