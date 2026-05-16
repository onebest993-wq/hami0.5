import React from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import type { Transaction, Expense } from '../types';

interface InvoicePreviewModalProps {
  transaction: Transaction;
  totalExpenses: number;
  onClose: () => void;
}

export const InvoicePreviewModal = ({ transaction, totalExpenses, onClose }: InvoicePreviewModalProps) => {
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
        className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6 pb-6 border-b-2 border-gray-200">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37] flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[#0D0D1A] font-bold text-2xl mb-1">كشف حساب وفاتورة</h1>
          <p className="text-gray-500 text-sm">مكتب المحامي • {new Date().toLocaleDateString('ar-IQ')}</p>
        </div>

        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-1">الموكل</p>
          <p className="text-[#0D0D1A] font-bold text-lg">{transaction.clientName}</p>
          <p className="text-gray-500 text-sm">معاملة: {transaction.transactionType}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-[#0D0D1A] font-bold text-base mb-3">المصاريف الرسمية</h3>
          <div className="space-y-2">
            {transaction.expenses.map((exp: Expense) => (
              <div key={exp.id} className="flex justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-700 text-sm">{exp.description}</span>
                <span className="text-[#0D0D1A] font-bold">{exp.amount.toLocaleString()} د.ع</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-gray-200 pt-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 font-medium">إجمالي المصاريف</span>
            <span className="text-[#0D0D1A] font-bold text-lg">{totalExpenses.toLocaleString()} د.ع</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">أتعاب المحاماة</span>
            <span className="text-[#0D0D1A] font-bold text-lg">{transaction.lawyerFee.total.toLocaleString()} د.ع</span>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="text-[#0D0D1A] font-bold text-lg">المجموع الكلي</span>
            <span className="text-[#D4AF37] font-bold text-xl">{(totalExpenses + transaction.lawyerFee.total).toLocaleString()} د.ع</span>
          </div>
        </div>

        <div className="text-center text-gray-400 text-xs">
          تم الإنشاء بواسطة النظام • شكراً لثقتكم
        </div>
      </motion.div>
    </motion.div>
  );
};
