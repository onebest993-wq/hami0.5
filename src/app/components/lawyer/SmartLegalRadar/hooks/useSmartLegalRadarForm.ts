import { useState, useCallback, useRef } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudRuntime';
import { EMPTY_FORM, mapEventFormToCalendarFields, type EventFormData } from '@/app/components/lawyer/SmartLegalRadar/eventFormModel';
import { storedCalendarIdFromUnified } from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

type UseSmartLegalRadarFormParams = {
    selectedDate: string;
    effectiveUserId: string;
    customEvents: CalendarEvent[];
    addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalendarEvent | null>;
    updateEvent: (event: CalendarEvent) => Promise<CalendarEvent | null>;
    deleteEvent: (eventId: string) => Promise<boolean>;
};

export function useSmartLegalRadarForm({
    selectedDate,
    effectiveUserId,
    customEvents,
    addEvent,
    updateEvent,
    deleteEvent,
}: UseSmartLegalRadarFormParams) {
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null);
    const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const saveInFlightRef = useRef(false);

    const openAddForm = useCallback(() => {
        if (saveInFlightRef.current) return;
        prefetchCalendarCloudModule();
        setEditingEvent(null);
        setFormData({ ...EMPTY_FORM, date: selectedDate, time: '' });
        setShowForm(true);
    }, [selectedDate]);

    const openEditForm = useCallback((event: UnifiedEvent) => {
        if (saveInFlightRef.current) return;
        if (event.bridge?.sourceEventId?.startsWith('field_')) {
            SmartToast.info('هذا التاريخ مكتشف تلقائياً من إضبارته — حرّره من المصدر الأصلي');
            return;
        }
        setEditingEvent(event);
        setFormData({
            title: event.title,
            date: event.date,
            time: event.time || '',
            type: event.type,
            location: event.location || '',
            notes: event.notes || '',
            clientName: event.clientName || '',
            clientPhone: '',
            reminderMinutesBefore: event.reminderMinutesBefore ?? null,
        });
        setShowForm(true);
    }, []);

    const closeForm = useCallback(() => {
        if (saving) return;
        setShowForm(false);
        setEditingEvent(null);
    }, [saving]);

    const handleSave = useCallback(async (data: EventFormData) => {
        if (saveInFlightRef.current) return;
        if (!data.title.trim() || !data.date) {
            SmartToast.warning('العنوان والتاريخ مطلوبان');
            return;
        }
        saveInFlightRef.current = true;
        setSaving(true);
        try {
            if (editingEvent && editingEvent.source === 'calendar') {
                const calId = storedCalendarIdFromUnified(editingEvent.id);
                const existing = customEvents.find((e) => e.id === calId);
                if (!existing) {
                    SmartToast.error('فشل حفظ الموعد');
                    return;
                }
                const updated = await updateEvent({
                    ...existing,
                    ...mapEventFormToCalendarFields(data),
                });
                if (!updated) {
                    SmartToast.error('فشل حفظ الموعد');
                    return;
                }
                SmartToast.success('تم تحديث الموعد');
            } else {
                const created = await addEvent({
                    userId: effectiveUserId,
                    ...mapEventFormToCalendarFields(data),
                });
                if (!created) {
                    SmartToast.error('فشل حفظ الموعد');
                    return;
                }
                SmartToast.success('تم إضافة الموعد');
            }
            setShowForm(false);
            setEditingEvent(null);
        } catch {
            SmartToast.error('فشل حفظ الموعد');
        } finally {
            saveInFlightRef.current = false;
            setSaving(false);
        }
    }, [editingEvent, effectiveUserId, addEvent, updateEvent, customEvents]);

    const handleDelete = useCallback(
        async (event: UnifiedEvent) => {
            if (event.bridge?.sourceEventId?.startsWith('field_')) {
                SmartToast.info('هذا التاريخ مكتشف تلقائياً من إضبارته — حرّره أو احذفه من المصدر الأصلي');
                return;
            }
            if (event.isBridged) {
                SmartToast.info('هذا الموعد مربوط بإضبارة — احذفه من داخل الإضبارة (الدعوى/التنفيذ)');
                return;
            }
            if (event.source !== 'calendar') {
                SmartToast.info('يمكن حذف المواعيد المخصصة فقط');
                return;
            }
            if (saveInFlightRef.current) return;
            saveInFlightRef.current = true;
            setSaving(true);
            try {
                const calId = storedCalendarIdFromUnified(event.id);
                const removed = await deleteEvent(calId);
                if (!removed) {
                    SmartToast.error('فشل حذف الموعد');
                    return;
                }
                SmartToast.success('تم حذف الموعد');
                if (editingEvent?.id === event.id) {
                    setShowForm(false);
                    setEditingEvent(null);
                }
            } catch {
                SmartToast.error('فشل حذف الموعد');
            } finally {
                saveInFlightRef.current = false;
                setSaving(false);
            }
        },
        [deleteEvent, editingEvent],
    );

    const handleFormDelete = useCallback(() => {
        if (editingEvent) void handleDelete(editingEvent);
    }, [editingEvent, handleDelete]);

    return {
        showForm,
        editingEvent,
        formData,
        saving,
        openAddForm,
        openEditForm,
        closeForm,
        handleSave,
        handleDelete,
        handleFormDelete,
    };
}
