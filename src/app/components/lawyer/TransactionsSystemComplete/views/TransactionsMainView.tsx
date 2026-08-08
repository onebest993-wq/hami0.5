import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, ChevronLeft, FileText,
  BarChart3, Archive, Plus
} from '@/app/components/ui/lucideIcons';
import type { Transaction } from '../types';
import { DEPARTMENTS } from '../constants';
import { TransactionCard } from '../components/TransactionCard';

interface TransactionsMainViewProps {
  transactions: Transaction[];
  onBack: () => void;
  onOpenDetails: (tx: Transaction) => void;
  onAddNew: () => void;
  onOpenAnalytics: () => void;
  onOpenArchive: () => void;
}

export const TransactionsMainView = ({
  transactions, onBack, onOpenDetails, onAddNew, onOpenAnalytics, onOpenArchive
}: TransactionsMainViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const filteredTransactions = transactions.filter((tx: Transaction) => {
    const matchesSearch = tx.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         Object.values(tx.details).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = selectedDepartment === 'all' || tx.departmentType === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="h-full pb-32">
      <div className="sticky top-0 z-50 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="p-5 flex items-center justify-between">
          <button type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">إدارة المعاملات</h1>
          <div className="flex gap-2">
            <button type="button"
              onClick={onOpenAnalytics}
              className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button type="button"
              onClick={onOpenArchive}
              className="w-10 h-10 rounded-full border border-gray-500/20 flex items-center justify-center text-gray-400 hover:bg-gray-500/10 transition"
            >
              <Archive className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم الموكل أو رقم العقار..."
              className="w-full h-14 bg-[#0D0D1A] border border-[#D4AF37]/20 rounded-2xl pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>
        </div>
        <div className="px-6 pb-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {DEPARTMENTS.map(dept => {
              const Icon = dept.icon;
              const isActive = selectedDepartment === dept.id;
              return (
                <motion.button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                    isActive
                      ? `${dept.color} text-white shadow-lg`
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                  {dept.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base">المعاملات النشطة</h3>
          <span className="text-gray-400 text-sm">{filteredTransactions.length} معاملة</span>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500 text-lg font-medium">لا توجد معاملات</p>
          </div>
        )}

        {filteredTransactions.map((tx: Transaction) => (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>

      <motion.button
        onClick={onAddNew}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 h-14 px-8 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full text-[#0D0D1A] font-bold text-base flex items-center gap-3 shadow-2xl shadow-[#D4AF37]/40 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-5 h-5" />
        معاملة جديدة
      </motion.button>
    </div>
  );
};
