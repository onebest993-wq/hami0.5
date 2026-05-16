import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, AlertCircle, UserCheck, Send, Archive } from 'lucide-react';
import { uuidv4 } from '@/app/services/lawyer-cloud';
import type { Transaction } from '../types';

interface HandoverReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
  onConfirm: (signature: { signedAt: Date; method: 'digital' | 'whatsapp'; signatureData?: string }) => void;
}

export const HandoverReceiptModal = ({ transaction, onClose, onConfirm }: HandoverReceiptModalProps) => {
  const [signatureMethod, setSignatureMethod] = useState<'digital' | 'whatsapp'>('digital');

  const handleConfirm = () => {
    onConfirm({
      signedAt: new Date(),
      method: signatureMethod,
      signatureData: uuidv4()
    });
  };

  const hasUnpaidFees = transaction.lawyerFee.remaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-2 border-[#D4AF37]/30 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">تسليم المنجز وإخلاء الطرف</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            أقر أنا الموكل <span className="text-[#D4AF37] font-bold">{transaction.clientName}</span> باستلام كافة الأوراق الأصلية والمنجزات الخاصة بمعاملة <span className="text-[#D4AF37] font-bold">{transaction.transactionType}</span> من مكتب المحامي، وأخلي طرف المكتب من أي مسؤولية.
          </p>
        </div>

        {hasUnpaidFees && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-400 font-bold text-sm mb-1">⚠️ تنبيه: أتعاب غير مسددة</p>
                <p className="text-amber-400/80 text-xs">
                  يتبقى بذمة الموكل مبلغ <span className="font-bold">{transaction.lawyerFee.remaining.toLocaleString()} دينار</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">طريقة التوقيع</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button"
              onClick={() => setSignatureMethod('digital')}
              className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                signatureMethod === 'digital'
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0D0D1A]'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-xs font-medium">توقيع رقمي</span>
            </button>
            <button type="button"
              onClick={() => setSignatureMethod('whatsapp')}
              className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                signatureMethod === 'whatsapp'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              <Send className="w-5 h-5" />
              <span className="text-xs font-medium">واتساب</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button"
            onClick={onClose}
            className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-gray-400 font-medium"
          >
            إلغاء
          </button>
          <button type="button"
            onClick={handleConfirm}
            className="flex-[2] h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            <Archive className="w-5 h-5" />
            تأكيد وأرشفة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
