import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, Search, Lock, Archive,
  Calendar, Eye, RefreshCw, Building2, FileText, Home, Car,
  Receipt, Users, Briefcase
} from '@/app/components/ui/lucideIcons';
import type { Transaction, DepartmentType } from '../types';
import { DEPARTMENTS } from '../constants';
import { getDepartmentInfo } from '../utils';

export interface ArchiveViewProps {
  transactions: Transaction[];
  onBack: () => void;
  onReopen: (tx: Transaction) => void;
  onOpenDetails: (tx: Transaction) => void;
}

export const ArchiveView = ({ transactions, onBack, onReopen, onOpenDetails }: ArchiveViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'client' | 'property' | 'vehicle' | 'tax'>('client');

  const filteredTransactions = transactions.filter((tx: Transaction) => {
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();

    switch (searchType) {
      case 'client':
        return tx.clientName.toLowerCase().includes(q);
      case 'property':
        return tx.details.propertyNumber?.toLowerCase().includes(q);
      case 'vehicle':
        return tx.details.vehicleNumber?.toLowerCase().includes(q);
      case 'tax':
        return tx.details.taxFileNumber?.toLowerCase().includes(q);
      default:
        return true;
    }
  });

  return (
    <div className="h-full pb-24">
      <div className="sticky top-0 z-50 bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20">
        <div className="p-5 flex items-center justify-between">
          <button type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">أرشيف المعاملات</h1>
          <div className="w-10" />
        </div>

        <div className="px-6 pb-4">
          <div className="relative mb-3">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === 'client' ? 'ابحث عن اسم الموكل...' :
                searchType === 'property' ? 'ابحث عن رقم العقار...' :
                searchType === 'vehicle' ? 'ابحث عن رقم المركبة...' :
                'ابحث عن رقم الإضبارة الضريبية...'
              }
              className="w-full h-14 bg-[#0D0D1A] border border-[#D4AF37]/20 rounded-2xl pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'client', label: 'اسم الموكل' },
              { id: 'property', label: 'رقم العقار' },
              { id: 'vehicle', label: 'رقم المركبة' },
              { id: 'tax', label: 'الإضبارة الضريبية' }
            ].map(type => (
              <button type="button"
                key={type.id}
                onClick={() => setSearchType(type.id as typeof searchType)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  searchType === type.id
                    ? 'bg-[#D4AF37] text-[#0D0D1A] shadow-lg'
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-gray-500" />
          <h3 className="text-gray-400 font-bold text-base">{filteredTransactions.length} معاملة مؤرشفة</h3>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500 text-lg font-medium">لا توجد معاملات مؤرشفة</p>
          </div>
        )}

        {filteredTransactions.map((tx: Transaction) => {
          const deptInfo = getDepartmentInfo(tx.departmentType);
          const DeptIcon = deptInfo.icon;

          return (
            <motion.div
              key={tx.id}
              className="bg-gradient-to-br from-gray-800/30 to-gray-900/20 border border-gray-700/30 rounded-3xl p-5"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center relative">
                  <DeptIcon className="w-5 h-5 text-gray-500" />
                  <Lock className="w-3 h-3 text-gray-600 absolute -top-1 -right-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">{deptInfo.label}</p>
                  <h3 className="text-gray-300 font-bold text-base truncate">{tx.transactionType}</h3>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/5">
                <p className="text-gray-500 text-xs mb-1">الموكل</p>
                <p className="text-gray-300 font-bold text-lg">{tx.clientName}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>تاريخ الإغلاق: {tx.completedAt?.toLocaleDateString('ar-IQ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => onOpenDetails(tx)}
                  className="h-10 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
                <button type="button"
                  onClick={() => onReopen(tx)}
                  className="h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/20 transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  إعادة فتح
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
