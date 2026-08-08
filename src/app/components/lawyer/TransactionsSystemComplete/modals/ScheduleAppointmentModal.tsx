import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Bell, CalendarDays } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { TransactionStep } from '../types';

interface ScheduleAppointmentModalProps {
  step: TransactionStep;
  onClose: () => void;
  onSave: (date: Date, time: string) => void;
}

export const ScheduleAppointmentModal = ({ step, onClose, onSave }: ScheduleAppointmentModalProps) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSave = () => {
    if (!date || !time) {
      SmartToast.warning('الرجاء إدخال التاريخ والوقت');
      return;
    }
    onSave(new Date(date), time);
  };

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
        className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] border-2 border-[#D4AF37]/30 rounded-3xl p-6 max-w-lg w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">تحديد موعد المراجعة</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl p-4 mb-6">
          <p className="text-[#D4AF37] font-bold text-sm mb-1">الخطوة</p>
          <p className="text-white text-base">{step.label}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">التاريخ *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">الوقت *</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-12 bg-[#0D0D1A] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 mb-6">
          <div className="flex items-center gap-2 text-blue-400 text-sm">
            <Bell className="w-4 h-4 shrink-0" />
            <p>سيتم إرسال تنبيه قبل الموعد بـ 24 ساعة</p>
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
            onClick={handleSave}
            className="flex-[2] h-12 bg-gradient-to-r from-[#D4AF37] to-[#F4C430] rounded-xl text-[#0D0D1A] font-bold flex items-center justify-center gap-2"
          >
            <CalendarDays className="w-5 h-5" />
            حفظ الموعد
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
