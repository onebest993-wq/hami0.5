import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays, AlertCircle, MapPin, Receipt, Calendar, FileText } from '@/app/components/ui/lucideIcons';
import type { Transaction, TransactionStep, DepartmentType } from '../types';
import { DEPARTMENTS } from '../constants';
import { getDeptInfo, getBadge } from '../utils';

interface TransactionCardProps {
  transaction: Transaction;
  onOpenDetails: (tx: Transaction) => void;
}

export const TransactionCard = ({ transaction, onOpenDetails }: TransactionCardProps) => {
  const tx = transaction;
  const deptInfo = getDeptInfo(tx.departmentType);
  const DeptIcon = deptInfo.icon;
  const statusBadge = getBadge(tx.status, tx.currentStep);
  const upcomingAppointment = tx.steps.find((s: TransactionStep) =>
    s.appointmentDate && !s.completed && new Date(s.appointmentDate) >= new Date()
  );

  return (
    <motion.div
      key={tx.id}
      onClick={() => onOpenDetails(tx)}
      className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:border-[#D4AF37]/40 transition-all cursor-pointer"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {upcomingAppointment && (
        <div className="mb-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-2 flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 text-xs font-bold">موعد قادم</p>
            <p className="text-blue-300 text-xs">
              {upcomingAppointment.label} • {new Date(upcomingAppointment.appointmentDate).toLocaleDateString('ar-IQ')}
              {upcomingAppointment.appointmentTime && ` الساعة ${upcomingAppointment.appointmentTime}`}
            </p>
          </div>
        </div>
      )}

      {tx.missingDocs && tx.missingDocs.length > 0 && (
        <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-400 text-xs">
            مستندات ناقصة: {tx.missingDocs.join('، ')}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${deptInfo.color} flex items-center justify-center`}>
          <DeptIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#D4AF37] text-xs font-medium">{deptInfo.label}</p>
          <h3 className="text-white font-bold text-base truncate">{tx.transactionType}</h3>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/10">
        <p className="text-gray-400 text-xs mb-1">الموكل</p>
        <p className="text-white font-bold text-lg">{tx.clientName}</p>
      </div>

      <div className="space-y-2 mb-3">
        {Object.entries(tx.details).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-400 truncate">{value}</span>
          </div>
        ))}
        {tx.receiptNumber && (
          <div className="flex items-center gap-2 text-sm">
            <Receipt className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-gray-400">وصل رقم: {tx.receiptNumber}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusBadge.color}`}>
          {statusBadge.label}
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {tx.createdAt.toLocaleDateString('ar-IQ')}
        </div>
      </div>
    </motion.div>
  );
};
