import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import type { EventFormData } from './utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { RADAR_GLASS_PANEL, RADAR_INPUT, RADAR_LABEL, RADAR_BTN_GOLD, RADAR_FORM_OVERLAY } from './radarTheme';

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
    show,
    onClose,
    formData,
    editingEvent,
    saving,
    onFormChange,
    onSave,
    onDelete,
}: EventFormProps) {
    useEffect(() => {
        if (!show) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || saving) return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [show, saving, onClose]);

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-overlay"
            onClick={() => {
                if (!saving) onClose();
            }}
        >
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full sm:max-w-lg ${RADAR_GLASS_PANEL} rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto border-t sm:border border-[#F5EDE0]/12`}
                data-testid="radar-event-form"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C4956A]/45 to-transparent" />

                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[#F5EDE0] font-bold text-lg">
                        {editingEvent ? 'تعديل الموعد' : 'إضافة موعد جديد'}
                    </h2>
                    <button
                        type="button"
                        data-testid="radar-event-form-close"
                        onClick={() => {
                            if (!saving) onClose();
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#F5EDE0]/10 text-[#E8DCC8]/55 hover:text-[#F5EDE0] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4" dir="rtl">
                    <div>
                        <label className={RADAR_LABEL}>العنوان *</label>
                        <input
                            data-testid="radar-event-title"
                            value={formData.title}
                            onChange={(e) => onFormChange('title', e.target.value)}
                            placeholder="مثال: جلسة مرافعة - قضية إرث"
                            className={RADAR_INPUT}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={RADAR_LABEL}>التاريخ *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => onFormChange('date', e.target.value)}
                                className={`${RADAR_INPUT} [color-scheme:dark]`}
                            />
                        </div>
                        <div>
                            <label className={RADAR_LABEL}>الوقت</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => onFormChange('time', e.target.value)}
                                className={`${RADAR_INPUT} [color-scheme:dark]`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={RADAR_LABEL}>الموقع</label>
                        <input
                            value={formData.location}
                            onChange={(e) => onFormChange('location', e.target.value)}
                            placeholder="مثال: محكمة بداءة الكرخ"
                            className={RADAR_INPUT}
                        />
                    </div>

                    <div>
                        <label className={RADAR_LABEL}>ملاحظات</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => onFormChange('notes', e.target.value)}
                            placeholder="ملاحظات إضافية..."
                            rows={3}
                            className={`${RADAR_INPUT} resize-none`}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    {editingEvent && editingEvent.source === 'calendar' && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/25 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            حذف
                        </button>
                    )}
                    <button
                        type="button"
                        data-testid="radar-event-save"
                        onClick={onSave}
                        disabled={saving || !formData.title.trim() || !formData.date}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            saving || !formData.title.trim() || !formData.date
                                ? 'bg-[#F5EDE0]/[0.06] text-[#E8DCC8]/35 cursor-not-allowed border border-[#F5EDE0]/10'
                                : `${RADAR_BTN_GOLD} w-full shadow-[0_0_24px_rgba(196,149,106,0.18)]`
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {editingEvent ? 'تحديث' : 'إضافة'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
});
