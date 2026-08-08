import React from 'react';
import { motion } from 'motion/react';
import { FileText, Upload, Eye, AlertCircle, Sparkles, Plus } from '@/app/components/ui/lucideIcons';
import type { Transaction, TransactionDocument, DepartmentType } from '../types';
import { REQUIRED_DOCS_BY_DEPT } from '../constants';

interface DocumentsTabProps {
  transaction: Transaction;
}

export const DocumentsTab = ({ transaction }: DocumentsTabProps) => {
  const requiredDocs = REQUIRED_DOCS_BY_DEPT[transaction.departmentType as DepartmentType] || [];
  const missingDocs = requiredDocs.filter(doc =>
    !transaction.documents.some((d: TransactionDocument) => d.name.includes(doc))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {missingDocs.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-500/40 rounded-3xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-400 font-bold text-base mb-1">✨ تنبيه ذكي: مستندات ناقصة</h3>
              <p className="text-amber-400/80 text-sm mb-3">
                هذه المعاملة تتطلب المستندات التالية:
              </p>
              <ul className="space-y-1">
                {missingDocs.map((doc, i) => (
                  <li key={i} className="text-amber-300 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {transaction.proxyNumber && (
        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#F4C430]/10 border-2 border-[#D4AF37]/40 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#0D0D1A]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">الوكالة القانونية</h3>
              <p className="text-[#D4AF37] text-sm">رقم {transaction.proxyNumber}</p>
            </div>
          </div>
          <button type="button" className="w-full h-12 bg-[#D4AF37] rounded-xl text-[#0D0D1A] font-bold flex items-center justify-center gap-2">
            <Eye className="w-5 h-5" />
            عرض الوكالة
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <h3 className="text-white font-bold text-base mb-4">المستمسكات والمرفقات</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {['هوية الموكل', 'سند العقار', 'صور شخصية', 'مستندات أخرى'].map((doc, i) => (
            <motion.div
              key={i}
              className="aspect-square bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#D4AF37]/30 transition"
              whileTap={{ scale: 0.95 }}
            >
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-gray-400 text-xs text-center px-2">{doc}</span>
            </motion.div>
          ))}
        </div>
        <button type="button" className="w-full h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] font-medium flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          إضافة مستند
        </button>
      </div>
    </motion.div>
  );
};
