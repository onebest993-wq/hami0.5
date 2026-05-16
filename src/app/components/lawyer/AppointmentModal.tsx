import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Bell } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface AppointmentModalProps {
    onClose: () => void;
    onSave: (appointment: {
        title: string;
        date: string;
        reminder: string;
    }) => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [reminder, setReminder] = useState('لا يوجد');
    
    const handleSave = () => {
        if (!title.trim() || !date) {
            SmartToast.error('يرجى تعبئة عنوان الموعد والتاريخ');
            return;
        }
        
        onSave({ title, date, reminder });
        
        // Reset
        setTitle('');
        setDate('');
        setReminder('لا يوجد');
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0B1120] border-2 border-amber-500/40 rounded-3xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-amber-500/30 p-4 flex justify-between items-center">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-amber-500/20 rounded-lg transition-all">
                        <X size={20} className="text-white" />
                    </button>
                    <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">
                        <Calendar size={20} />
                        إضافة موعد جديد
                    </h2>
                </div>
                
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-amber-400 mb-2 block">عنوان الموعد *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                            placeholder="مثال: جلسة مزاد العقار، موعد تسليم كتاب..."
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-amber-400 mb-2 block">تاريخ ووقت الموعد *</label>
                        <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white"
                            style={{ direction: 'ltr', textAlign: 'right' }}
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-amber-400 mb-2 block flex items-center gap-1.5">
                            <Bell size={12} />
                            التذكير (اختياري)
                        </label>
                        <select
                            value={reminder}
                            onChange={(e) => setReminder(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                        >
                            <option value="لا يوجد">لا يوجد</option>
                            <option value="في نفس اليوم">في نفس اليوم</option>
                            <option value="قبل يوم واحد">ذكرني قبل يوم</option>
                            <option value="قبل 3 أيام">ذكرني قبل 3 أيام</option>
                            <option value="قبل أسبوع">ذكرني قبل أسبوع</option>
                        </select>
                    </div>
                    
                    <button type="button"
                        onClick={handleSave}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30"
                    >
                        ✅ حفظ الموعد
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
