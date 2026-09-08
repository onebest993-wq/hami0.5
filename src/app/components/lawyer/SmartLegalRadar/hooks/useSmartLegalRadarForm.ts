import { useState, useCallback, useRef, useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { prefetchCalendarCloudModule } from '@/app/services/calendar/calendarCloudRuntime';
import { EMPTY_FORM, mapEventFormToCalendarFields, type EventFormData } from '@/app/components/lawyer/SmartLegalRadar/eventFormModel';
import {
    storedCalendarIdFromUnified,
    unifiedCalendarEventId,
} from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';
import {
    consumeCalendarShellFormIntent,
    subscribeCalendarShellSession,
} from '@/app/services/calendar/calendarShellSession';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import { tearDownCalendarFloatingState } from '@/app/components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

type UseSmartLegalRadarFormParams = {
    selectedDate: string;
    effectiveUserId: string;
    customEvents: CalendarEvent[];
    addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalendarEvent | null>;
    updateEvent: (event: CalendarEvent) => Promise<CalendarEvent | null>;
    deleteEvent: (eventId: string) => Promise<boolean>;
};

let radarFormSessionCounter = 0;
let lastActiveRadarFormId = 0;

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
    const formSessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    const openAddForm = useCallback(() => {
        radarFormSessionCounter += 1;
        formSessionIdRef.current = radarFormSessionCounter;
        const thisFormId = formSessionIdRef.current;
        activeSessionIdRef.current = thisFormId;
        lastActiveRadarFormId = thisFormId;

        if (activeSessionIdRef.current !== thisFormId) return;
        if (saveInFlightRef.current) return;
        prefetchCalendarCloudModule();
        if (activeSessionIdRef.current !== thisFormId) return;
        setEditingEvent(null);
        setFormData({ ...EMPTY_FORM, date: selectedDate, time: '' });
        setShowForm(true);
    }, [selectedDate]);

    const openEditForm = useCallback((event: UnifiedEvent) => {
        radarFormSessionCounter += 1;
        formSessionIdRef.current = radarFormSessionCounter;
        const thisFormId = formSessionIdRef.current;
        activeSessionIdRef.current = thisFormId;
        lastActiveRadarFormId = thisFormId;

        if (activeSessionIdRef.current !== thisFormId) return;
        if (saveInFlightRef.current) return;
        if (event.bridge?.sourceEventId?.startsWith('field_')) {
            SmartToast.info('هذا التاريخ مكتشف تلقائياً من إضبارته — حرّره من المصدر الأصلي');
            return;
        }
        if (activeSessionIdRef.current !== thisFormId) return;
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
        if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
        if (saving) return;
        setShowForm(false);
        setEditingEvent(null);
    }, [saving]);

    useEffect(() => {
        radarFormSessionCounter += 1;
        formSessionIdRef.current = radarFormSessionCounter;
        const thisEffectId = formSessionIdRef.current;
        activeSessionIdRef.current = thisEffectId;
        lastActiveRadarFormId = thisEffectId;

        const applyIntent = () => {
            if (activeSessionIdRef.current !== thisEffectId) return;
            const intent = consumeCalendarShellFormIntent();
            if (!intent) return;
            if (intent.kind === 'add') {
                openAddForm();
                return;
            }
            const storedId = storedCalendarIdFromUnified(intent.eventId);
            const row = customEvents.find((event) => event.id === storedId);
            if (!row) return;
            openEditForm({
                id: unifiedCalendarEventId(row.id),
                title: row.title,
                date: row.date,
                time: row.time,
                type: row.type,
                location: row.location,
                notes: row.notes,
                clientName: row.clientName,
                source: 'calendar',
                reminderMinutesBefore: row.reminderMinutesBefore ?? null,
            });
        };
        applyIntent();
        const unsub = subscribeCalendarShellSession(() => {
            if (activeSessionIdRef.current !== thisEffectId) return;
            applyIntent();
        });
        return () => {
            unsub();
            if (activeSessionIdRef.current === thisEffectId) {
                activeSessionIdRef.current = 0;
                tearDownCalendarFloatingState(thisEffectId);
            }
        };
    }, [customEvents, openAddForm, openEditForm]);

    const handleSave = useCallback(async (rawData: EventFormData) => {
        if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
        if (saveInFlightRef.current) return;
        if (!rawData.title.trim() || !rawData.date) {
            SmartToast.warning('العنوان والتاريخ مطلوبان');
            return;
        }

        const data: EventFormData = {
            ...rawData,
            title: sanitizeProfilePlainText(rawData.title, 120), // outbound-sanitize: title
            location: sanitizeProfilePlainText(rawData.location, 200), // outbound-sanitize: location
            notes: sanitizeProfilePlainText(rawData.notes, 1000), // outbound-sanitize: notes
            clientName: sanitizeProfilePlainText(rawData.clientName, 200), // outbound-sanitize: clientName
            clientPhone: sanitizeProfilePlainText(rawData.clientPhone, 100), // outbound-sanitize: contact
        };

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
                if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
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
                if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
                if (!created) {
                    SmartToast.error('فشل حفظ الموعد');
                    return;
                }
                SmartToast.success('تم إضافة الموعد');
            }
            setShowForm(false);
            setEditingEvent(null);
        } catch {
            if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
            SmartToast.error('فشل حفظ الموعد');
        } finally {
            if (lastActiveRadarFormId === activeSessionIdRef.current) {
                saveInFlightRef.current = false;
                setSaving(false);
            }
        }
    }, [editingEvent, effectiveUserId, addEvent, updateEvent, customEvents]);

    const handleDelete = useCallback(
        async (event: UnifiedEvent) => {
            if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
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
                if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
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
                if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
                SmartToast.error('فشل حذف الموعد');
            } finally {
                if (lastActiveRadarFormId === activeSessionIdRef.current) {
                    saveInFlightRef.current = false;
                    setSaving(false);
                }
            }
        },
        [deleteEvent, editingEvent],
    );

    const handleFormDelete = useCallback(() => {
        if (lastActiveRadarFormId !== activeSessionIdRef.current) return;
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
