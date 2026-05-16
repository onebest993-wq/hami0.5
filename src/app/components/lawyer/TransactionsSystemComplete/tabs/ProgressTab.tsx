import React from 'react';
import { motion } from 'motion/react';
import {
  Check, Circle, Clock, CalendarDays, AlertCircle, Flag
} from 'lucide-react';
import type { Transaction, TransactionStep } from '../types';

interface ProgressTabProps {
  transaction: Transaction;
  onToggleStep: (stepId: string) => void;
  progressPercent: number;
  allStepsCompleted: boolean;
  onComplete: () => void;
  onScheduleStep: (step: TransactionStep) => void;
}

export const ProgressTab = ({
  transaction, onToggleStep, progressPercent, allStepsCompleted, onComplete, onScheduleStep
}: ProgressTabProps) => {
  const hasUnpaidFees = transaction.lawyerFee.remaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">نسبة الإنجاز</span>
          <span className="text-[#D4AF37] font-bold text-lg">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-full"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border border-[#D4AF37]/20 rounded-3xl p-6">
        <h3 className="text-white font-bold text-base mb-6">خطوات المعاملة</h3>
        <div className="space-y-4">
          {transaction.steps.map((step: TransactionStep, index: number) => (
            <div key={step.id} className="space-y-2">
              <motion.div
                className="flex items-start gap-4 group cursor-pointer"
                onClick={() => onToggleStep(step.id)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.completed
                        ? 'bg-[#D4AF37] border-[#D4AF37]'
                        : 'bg-transparent border-gray-600 group-hover:border-[#D4AF37]/50'
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {step.completed ? (
                      <Check className="w-4 h-4 text-[#0D0D1A]" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-600" />
                    )}
                  </motion.div>
                  {index < transaction.steps.length - 1 && (
                    <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                      step.completed ? 'bg-[#D4AF37]/50' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`font-medium mb-1 ${step.completed ? 'text-white line-through' : 'text-gray-300'}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.date.toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </motion.div>

              {!step.completed && (
                <div className="mr-12">
                  {step.appointmentDate ? (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-blue-400 text-xs font-bold">موعد محدد</p>
                          <p className="text-blue-300 text-xs">
                            {new Date(step.appointmentDate).toLocaleDateString('ar-IQ')}
                            {step.appointmentTime && ` • ${step.appointmentTime}`}
                          </p>
                        </div>
                      </div>
                      <button type="button"
                        onClick={() => onScheduleStep(step)}
                        className="text-blue-400 text-xs hover:underline"
                      >
                        تعديل
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => onScheduleStep(step)}
                      whileTap={{ scale: 0.95 }}
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/10 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition"
                    >
                      <CalendarDays className="w-4 h-4" />
                      🗓️ جدولة موعد
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {allStepsCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30 rounded-3xl p-6"
        >
          {hasUnpaidFees && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-400 font-bold text-sm mb-1">⚠️ تنبيه: أتعاب غير مسددة</p>
                <p className="text-amber-400/80 text-xs">
                  يتبقى بذمة الموكل مبلغ {transaction.lawyerFee.remaining.toLocaleString()} دينار
                </p>
              </div>
            </div>
          )}

          <motion.button
            onClick={onComplete}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-green-500/30"
          >
            <Flag className="w-5 h-5" />
            🏁 إنجاز المعاملة وأرشفتها
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};
