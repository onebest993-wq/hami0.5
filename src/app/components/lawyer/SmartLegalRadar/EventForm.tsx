import React from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { TYPE_STYLES, EMPTY_FORM } from './utils';
import type { EventFormData } from './utils';
import type { CalendarEventType } from '@/app/services/lawyer-cloud';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

interface EventFormProps {
    show: boolean;
    onClose: () => void;
    formData: EventFormData;
    editingEvent: UnifiedEvent | null;
    saving: boolean;
    onFormChange: (field: keyof EventFormData, value: string) => void;
    onSave: () => void;
    onDelete: () => void;
}

export const EventForm = React.memo(function EventForm({
    show, onClose, formData, editingEvent, saving,
    onFormChange, onSave, onDelete
}: EventFormProps) {
    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => { if (!saving) onClose(); }}
        >
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full sm:max-w-lg bg-[#0B1021] border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        {editingEvent ? 'تعديل الموعد' : 'إضافة موعد جديد'}
                    </h2>
                    <button type="button"
                        onClick={() => { if (!saving) onClose(); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4" dir="rtl">
                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">العنوان *</label>
                        <input
                            value={formData.title}
                            onChange={(e) => onFormChange('title', e.target.value)}
                            placeholder="مثال: جلسة مرافعة - قضية إرث"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">التاريخ *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => onFormChange('date', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">الوقت</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => onFormChange('time', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">النوع</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {(['hearing', 'deadline', 'consultation', 'execution', 'custom'] as CalendarEventType[]).map((t) => {
                                const s = TYPE_STYLES[t];
                                return (
                                    <button type="button"
                                        key={t}
                                        onClick={() => onFormChange('type', t)}
                                        className={`px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                                            formData.type === t
                                                ? `${s.bg} ${s.color} ${s.border}`
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">الموقع</label>
                        <input
                            value={formData.location}
                            onChange={(e) => onFormChange('location', e.target.value)}
                            placeholder="مثال: محكمة بداءة الكرخ"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">اسم الموكل</label>
                            <input
                                value={formData.clientName}
                                onChange={(e) => onFormChange('clientName', e.target.value)}
                                placeholder="اسم الموكل"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-1">رقم الهاتف</label>
                            <input
                                value={formData.clientPhone}
                                onChange={(e) => onFormChange('clientPhone', e.target.value)}
                                placeholder="رقم الهاتف"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">ملاحظات</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => onFormChange('notes', e.target.value)}
                            placeholder="ملاحظات إضافية..."
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    {editingEvent && editingEvent.source === 'calendar' && (
                        <button type="button"
                            onClick={onDelete}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/30 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            حذف
                        </button>
                    )}
                    <button type="button"
                        onClick={onSave}
                        disabled={saving || !formData.title.trim() || !formData.date}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            saving
                                ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                        }`}
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {editingEvent ? 'تحديث' : 'إضافة'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
});
