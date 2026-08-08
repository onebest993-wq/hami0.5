import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Loader2, Save, Trash2, Bell, BellRing } from '@/app/components/ui/lucideIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { resolveGlobalSearchSheetStyle } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';
import type { EventFormData } from './utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    RADAR_FORM_OVERLAY,
    RADAR_FORM_PANEL,
    RADAR_FORM_INPUT,
    RADAR_FORM_LABEL,
    RADAR_FORM_ICON_BTN,
    RADAR_FORM_BTN_DISABLED,
    RADAR_FORM_BTN_DANGER,
    RADAR_BTN_GOLD,
} from './radarTheme';
import {
    CALENDAR_REMINDER_OPTIONS_MINUTES,
    formatCalendarReminderChip,
} from '@/app/services/calendar/calendarEventReminder';
import { requestHamiNotificationPermission } from '@/app/services/notifications/HamiNotificationBridge';
import { primeHamiLegalReminderAudio } from '@/app/services/calendar/calendarReminderAlarmSound';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface EventFormProps {
    show: boolean;
    onClose: () => void;
    formData: EventFormData;
    editingEvent: UnifiedEvent | null;
    saving: boolean;
    onSave: (data: EventFormData) => void;
    onDelete: () => void;
}

export const EventForm = React.memo(function EventForm({
    show,
    onClose,
    formData,
    editingEvent,
    saving,
    onSave,
    onDelete,
}: EventFormProps) {
    const [localFormData, setLocalFormData] = useState(formData);
    const wasOpenRef = useRef(false);
    const titleInputId = 'radar-event-title-input';
    const dateInputId = 'radar-event-date-input';
    const timeInputId = 'radar-event-time-input';
    const locationInputId = 'radar-event-location-input';
    const notesInputId = 'radar-event-notes-input';
    const formTitleId = 'radar-event-form-title';
    const panelRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReduceMotion();
    const keyboardInset = useMobileKeyboardInset(show, true);
    const keyboardResizeGuardUntilRef = useRef(0);

    useEffect(() => {
        if (show && !wasOpenRef.current) {
            setLocalFormData(formData);
        }
        wasOpenRef.current = show;
    }, [show, formData, editingEvent?.id]);

    useBodyScrollLock(show);

    useEffect(() => {
        if (!show || keyboardInset <= 0) return;
        keyboardResizeGuardUntilRef.current = Date.now() + 320;
    }, [show, keyboardInset]);

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

    const hasTime = Boolean(localFormData.time?.trim());
    const reminderEnabled =
        hasTime && localFormData.reminderMinutesBefore !== null && localFormData.reminderMinutesBefore > 0;

    const content = (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.14, ease: 'easeOut' }}
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-overlay"
            onClick={() => {
                if (saving || Date.now() < keyboardResizeGuardUntilRef.current) return;
                onClose();
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
                className={RADAR_FORM_PANEL}
                data-testid="radar-event-form"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onKeyDown={onKeyDownCapture}
                style={{
                    ...(reduceMotion ? undefined : { willChange: 'transform, opacity' }),
                    ...resolveGlobalSearchSheetStyle(keyboardInset),
                }}
            >
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E2E8F0]">
                    <h2 id={formTitleId} className="font-bold text-lg text-[#121212]">
                        {editingEvent ? 'تعديل الموعد' : 'إضافة موعد جديد'}
                    </h2>
                    <button
                        type="button"
                        data-testid="radar-event-form-close"
                        aria-label="إغلاق نموذج الموعد"
                        onClick={() => {
                            if (!saving) onClose();
                        }}
                        className={RADAR_FORM_ICON_BTN}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4" dir="rtl">
                    <div>
                        <label htmlFor={titleInputId} className={RADAR_FORM_LABEL}>العنوان *</label>
                        <input
                            id={titleInputId}
                            data-testid="radar-event-title"
                            value={localFormData.title}
                            maxLength={160}
                            enterKeyHint="next"
                            onChange={(e) =>
                                setLocalFormData((prev) => ({ ...prev, title: e.target.value }))
                            }
                            className={RADAR_FORM_INPUT}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor={dateInputId} className={RADAR_FORM_LABEL}>التاريخ *</label>
                            <input
                                id={dateInputId}
                                type="date"
                                value={localFormData.date}
                                onChange={(e) =>
                                    setLocalFormData((prev) => ({ ...prev, date: e.target.value }))
                                }
                                onFocus={(e) => openNativePicker(e.currentTarget)}
                                className={RADAR_FORM_INPUT}
                            />
                        </div>
                        <div>
                            <label htmlFor={timeInputId} className={RADAR_FORM_LABEL}>الوقت</label>
                            <div className="flex items-stretch gap-1.5">
                                <input
                                    id={timeInputId}
                                    type="time"
                                    value={localFormData.time}
                                    step={300}
                                    onChange={(e) => {
                                        const nextTime = e.target.value;
                                        setLocalFormData((prev) => ({
                                            ...prev,
                                            time: nextTime,
                                            reminderMinutesBefore: nextTime.trim()
                                                ? prev.reminderMinutesBefore
                                                : null,
                                        }));
                                    }}
                                    onFocus={(e) => openNativePicker(e.currentTarget)}
                                    className={`${RADAR_FORM_INPUT} min-w-0 flex-1`}
                                />
                                <button
                                    type="button"
                                    data-testid="radar-event-reminder-toggle"
                                    disabled={!hasTime}
                                    aria-pressed={reminderEnabled}
                                    aria-label={reminderEnabled ? 'إيقاف التذكير' : 'تفعيل التذكير'}
                                    title={hasTime ? 'تذكير قبل الموعد' : 'أضف وقتاً لتفعيل التذكير'}
                                    onClick={() => {
                                        if (!hasTime) return;
                                        const willEnable = !(
                                            localFormData.reminderMinutesBefore &&
                                            localFormData.reminderMinutesBefore > 0
                                        );
                                        if (willEnable) {
                                            void primeHamiLegalReminderAudio();
                                            void requestHamiNotificationPermission({
                                                fromUserGesture: true,
                                            });
                                        }
                                        setLocalFormData((prev) => ({
                                            ...prev,
                                            reminderMinutesBefore:
                                                prev.reminderMinutesBefore && prev.reminderMinutesBefore > 0
                                                    ? null
                                                    : 10,
                                        }));
                                    }}
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border touch-manipulation transition-colors ${
                                        !hasTime
                                            ? 'border-[#CBD5E1]/50 text-[#94A3B8]/40 cursor-not-allowed'
                                            : reminderEnabled
                                              ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#A67C52]'
                                              : 'border-[#CBD5E1] text-[#64748B] hover:border-[#94A3B8]'
                                    }`}
                                >
                                    {reminderEnabled ? <BellRing size={17} /> : <Bell size={17} />}
                                </button>
                            </div>
                            {reminderEnabled ? (
                                <div
                                    className="mt-2 flex flex-wrap gap-1.5"
                                    data-testid="radar-event-reminder-options"
                                    role="group"
                                    aria-label="مدة التذكير قبل الموعد"
                                >
                                    {CALENDAR_REMINDER_OPTIONS_MINUTES.map((minutes) => {
                                        const active = localFormData.reminderMinutesBefore === minutes;
                                        return (
                                            <button
                                                key={minutes}
                                                type="button"
                                                data-testid={`radar-event-reminder-${minutes}`}
                                                aria-pressed={active}
                                                onClick={() =>
                                                    setLocalFormData((prev) => ({
                                                        ...prev,
                                                        reminderMinutesBefore: minutes,
                                                    }))
                                                }
                                                className={`min-h-[32px] rounded-lg border px-2.5 text-[10px] font-bold touch-manipulation transition-colors ${
                                                    active
                                                        ? 'border-[#E6C673]/45 bg-[#E6C673]/14 text-[#7A5C32]'
                                                        : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]'
                                                }`}
                                            >
                                                {formatCalendarReminderChip(minutes)}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div>
                        <label htmlFor={locationInputId} className={RADAR_FORM_LABEL}>الموقع</label>
                        <input
                            id={locationInputId}
                            value={localFormData.location}
                            maxLength={160}
                            enterKeyHint="next"
                            onChange={(e) =>
                                setLocalFormData((prev) => ({ ...prev, location: e.target.value }))
                            }
                            className={RADAR_FORM_INPUT}
                        />
                    </div>

                    <div>
                        <label htmlFor={notesInputId} className={RADAR_FORM_LABEL}>ملاحظات</label>
                        <textarea
                            id={notesInputId}
                            value={localFormData.notes}
                            maxLength={600}
                            onChange={(e) =>
                                setLocalFormData((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            rows={3}
                            className={`${RADAR_FORM_INPUT} resize-none min-h-[96px]`}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
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
                            className={RADAR_FORM_BTN_DANGER}
                        >
                            <Trash2 size={16} />
                            حذف
                        </button>
                    )}
                    <button
                        type="button"
                        data-testid="radar-event-save"
                        onClick={() => void onSave(localFormData)}
                        aria-label={editingEvent ? `تحديث الموعد ${editingEvent.title}` : 'إضافة الموعد'}
                        disabled={saving || !localFormData.title.trim() || !localFormData.date}
                        className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all touch-manipulation ${
                            saving || !localFormData.title.trim() || !localFormData.date
                                ? RADAR_FORM_BTN_DISABLED
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
