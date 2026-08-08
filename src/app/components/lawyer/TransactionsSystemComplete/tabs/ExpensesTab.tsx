import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Camera, Sparkles, Printer } from '@/app/components/ui/lucideIcons';
import type { Transaction, Expense } from '../types';

interface ExpensesTabProps {
  transaction: Transaction;
  onAddExpense: (description: string, amount: number, category: Expense['category']) => void;
  totalExpenses: number;
  onGenerateInvoice: () => void;
}

export const ExpensesTab = ({ transaction, onAddExpense, totalExpenses, onGenerateInvoice }: ExpensesTabProps) => {
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = () => {
    if (newDesc && newAmount) {
      onAddExpense(newDesc, parseFloat(newAmount), 'misc');
      setNewDesc('');
      setNewAmount('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <h3 className="text-white font-bold text-base mb-4">إضافة مصروف جديد</h3>
        
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl text-purple-300 font-medium mb-4 flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          <Sparkles className="w-4 h-4" />
          ✨ تصوير الوصل (AI)
        </motion.button>

        <div className="space-y-3">
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="وصف المصروف"
            className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
          />
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="المبلغ (دينار)"
            className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
          />
          <button type="button"
            onClick={handleAdd}
            className="w-full h-12 bg-[#D4AF37] rounded-xl text-[#0D0D1A] font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <h3 className="text-white font-bold text-base mb-4">المصاريف الرسمية</h3>
        <div className="space-y-3">
          {transaction.expenses.length === 0 && (
            <p className="text-gray-500 text-center py-8">لا توجد مصاريف</p>
          )}
          {transaction.expenses.map((exp: Expense) => (
            <div key={exp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white font-medium text-sm">{exp.description}</p>
                <p className="text-gray-500 text-xs">{exp.date.toLocaleDateString('ar-IQ')}</p>
              </div>
              <p className="text-[#D4AF37] font-bold">{exp.amount.toLocaleString()} د.ع</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <h3 className="text-white font-bold text-base mb-4">أتعاب المحاماة</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">المبلغ الكلي</span>
            <span className="text-white font-bold">{transaction.lawyerFee.total.toLocaleString()} د.ع</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">الواصل</span>
            <span className="text-green-400 font-bold">{transaction.lawyerFee.paid.toLocaleString()} د.ع</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/10">
            <span className="text-gray-400">المتبقي</span>
            <span className="text-red-400 font-bold">{transaction.lawyerFee.remaining.toLocaleString()} د.ع</span>
          </div>
        </div>
      </div>

      <motion.button
        onClick={onGenerateInvoice}
        whileTap={{ scale: 0.98 }}
        className="w-full h-14 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-2xl text-[#0D0D1A] font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-[#D4AF37]/30"
      >
        <Printer className="w-5 h-5" />
        📑 إصدار كشف حساب
      </motion.button>

      <div className="sticky bottom-6 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[#0D0D1A] font-bold text-lg">إجمالي المصاريف</span>
          <span className="text-[#0D0D1A] font-bold text-2xl">{totalExpenses.toLocaleString()} د.ع</span>
        </div>
      </div>
    </motion.div>
  );
};
