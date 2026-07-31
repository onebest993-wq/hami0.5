import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { EventFormData } from './utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { RADAR_GLASS_PANEL, RADAR_INPUT, RADAR_LABEL, RADAR_BTN_GOLD, RADAR_FORM_OVERLAY } from './radarTheme';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
    const titleInputId = 'radar-event-title-input';
    const dateInputId = 'radar-event-date-input';
    const timeInputId = 'radar-event-time-input';
    const locationInputId = 'radar-event-location-input';
    const notesInputId = 'radar-event-notes-input';
    const formTitleId = 'radar-event-form-title';
    const panelRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReduceMotion();

    useBodyScrollLock(show);

    const openNativePicker = (target: HTMLInputElement) => {
        if (typeof target.showPicker === 'function') {
            try {
                target.showPicker();
            } catch {
                /* ignore unsupported picker behavior */
            }
        }
    };

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

    useEffect(() => {
        if (!show) return;
        const frame = requestAnimationFrame(() => {
            panelRef.current
                ?.querySelector<HTMLInputElement>(`#${titleInputId}`)
                ?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [show, titleInputId]);

    const onKeyDownCapture = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !panelRef.current) return;
        const focusables = Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
            if (active === first || !panelRef.current.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else if (active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    if (!show) return null;

    const content = (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.14, ease: 'easeOut' }}
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-overlay"
            onClick={() => {
                if (!saving) onClose();
            }}
        >
            <motion.div
                ref={panelRef}
                initial={reduceMotion ? false : { y: 20, opacity: 0, scale: 0.985 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { y: 12, opacity: 0, scale: 0.99 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={formTitleId}
                className={`w-full sm:max-w-lg ${RADAR_GLASS_PANEL} rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto overscroll-contain border-t sm:border border-[#F5EDE0]/12 bg-[#1f1712] sm:bg-[#1f1712] backdrop-blur-none`}
                data-testid="radar-event-form"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={onKeyDownCapture}
                style={{ willChange: 'transform, opacity' }}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E8DCC8]/40 to-transparent" />

                <div className="flex items-center justify-between mb-5">
                    <h2 id={formTitleId} className="text-[#F5EDE0] font-bold text-lg">
                        {editingEvent ? 'تعديل الموعد' : 'إضافة موعد جديد'}
                    </h2>
                    <button
                        type="button"
                        data-testid="radar-event-form-close"
                        aria-label="إغلاق نموذج الموعد"
                        onClick={() => {
                            if (!saving) onClose();
                        }}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-[#E8DCC8]/55 transition-colors touch-manipulation hover:bg-[#F5EDE0]/10 hover:text-[#F5EDE0]"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4" dir="rtl">
                    <div>
                        <label htmlFor={titleInputId} className={RADAR_LABEL}>العنوان *</label>
                        <input
                            id={titleInputId}
                            data-testid="radar-event-title"
                            value={formData.title}
                            maxLength={160}
                            enterKeyHint="next"
                            onChange={(e) => onFormChange('title', e.target.value)}
                            placeholder="مثال: جلسة مرافعة - قضية إرث"
                            className={RADAR_INPUT}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor={dateInputId} className={RADAR_LABEL}>التاريخ *</label>
                            <input
                                id={dateInputId}
                                type="date"
                                value={formData.date}
                                onChange={(e) => onFormChange('date', e.target.value)}
                                onFocus={(e) => openNativePicker(e.currentTarget)}
                                className={`${RADAR_INPUT} min-h-[44px] touch-manipulation [color-scheme:dark]`}
                            />
                        </div>
                        <div>
                            <label htmlFor={timeInputId} className={RADAR_LABEL}>الوقت</label>
                            <input
                                id={timeInputId}
                                type="time"
                                value={formData.time}
                                step={300}
                                onChange={(e) => onFormChange('time', e.target.value)}
                                onFocus={(e) => openNativePicker(e.currentTarget)}
                                className={`${RADAR_INPUT} min-h-[44px] touch-manipulation [color-scheme:dark]`}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor={locationInputId} className={RADAR_LABEL}>الموقع</label>
                        <input
                            id={locationInputId}
                            value={formData.location}
                            maxLength={160}
                            enterKeyHint="next"
                            onChange={(e) => onFormChange('location', e.target.value)}
                            placeholder="مثال: محكمة بداءة الكرخ"
                            className={RADAR_INPUT}
                        />
                    </div>

                    <div>
                        <label htmlFor={notesInputId} className={RADAR_LABEL}>ملاحظات</label>
                        <textarea
                            id={notesInputId}
                            value={formData.notes}
                            maxLength={600}
                            onChange={(e) => onFormChange('notes', e.target.value)}
                            placeholder="ملاحظات إضافية..."
                            rows={3}
                            className={`${RADAR_INPUT} resize-none`}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    {editingEvent &&
                        editingEvent.source === 'calendar' &&
                        !editingEvent.bridge?.sourceEventId?.startsWith('field_') && (
                        <button
                            type="button"
                            data-testid="radar-event-delete"
                            onClick={() => {
                                if (!saving) onDelete();
                            }}
                            disabled={saving}
                            aria-label={editingEvent ? `حذف الموعد ${editingEvent.title}` : 'حذف الموعد'}
                            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8DCC8]/30 bg-[#F5EDE0]/[0.08] px-4 py-2.5 text-sm font-bold text-[#E8DCC8] transition-all touch-manipulation hover:bg-[#9AADB0]/18 hover:border-[#B7C5C7]/40 hover:text-[#FAF7F2] disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            حذف
                        </button>
                    )}
                    <button
                        type="button"
                        data-testid="radar-event-save"
                        onClick={() => void onSave()}
                        aria-label={editingEvent ? `تحديث الموعد ${editingEvent.title}` : 'إضافة الموعد'}
                        disabled={saving || !formData.title.trim() || !formData.date}
                        className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all touch-manipulation ${
                            saving || !formData.title.trim() || !formData.date
                                ? 'bg-[#F5EDE0]/[0.06] text-[#E8DCC8]/35 cursor-not-allowed border border-[#F5EDE0]/10'
                                : `${RADAR_BTN_GOLD} w-full`
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {editingEvent ? 'تحديث' : 'إضافة'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    if (typeof document === 'undefined') {
        return content;
    }

    return createPortal(content, document.body);
});
