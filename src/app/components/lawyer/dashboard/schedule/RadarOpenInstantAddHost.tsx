import React, { Suspense, useCallback, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    getCachedCalendarEvents,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { newCalendarEventId } from '@/app/services/calendar/calendarEventRecord';
import {
    EMPTY_FORM,
    mapEventFormToCalendarFields,
    type EventFormData,
} from '@/app/services/calendar/calendarEventForm';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    loadRadarEventFormModule,
    prefetchRadarEventForm,
} from '@/app/components/lawyer/dashboard/schedule/prefetchRadarEventForm';
import { RadarEventFormInstantCover } from '@/app/components/lawyer/dashboard/schedule/RadarEventFormInstantCover';

const EventFormLazy = React.lazy(async () => {
    const mod = await loadRadarEventFormModule();
    return { default: mod.EventForm };
});

type RadarOpenInstantAddHostProps = {
    userId?: string | null;
    selectedDate: string;
    show: boolean;
    editingEventId: string | null;
    onClose: () => void;
};

function cachedEventById(userId: string, eventId: string): CalendarEvent | null {
    return getCachedCalendarEvents(userId)?.find((event) => event.id === eventId) ?? null;
}

function formFromEvent(event: CalendarEvent): EventFormData {
    return {
        title: event.title,
        date: event.date.slice(0, 10),
        time: event.time || '',
        type: event.type,
        location: event.location || '',
        notes: event.notes || '',
        clientName: event.clientName || '',
        clientPhone: event.clientPhone || '',
        reminderMinutesBefore: event.reminderMinutesBefore ?? null,
    };
}

function upsertCachedEvent(userId: string, event: CalendarEvent): void {
    const prev = getCachedCalendarEvents(userId) ?? [];
    setCachedCalendarEvents(userId, [...prev.filter((row) => row.id !== event.id), event]);
}

function removeCachedEvent(userId: string, eventId: string): void {
    const prev = getCachedCalendarEvents(userId) ?? [];
    setCachedCalendarEvents(
        userId,
        prev.filter((row) => row.id !== eventId),
    );
}

export const RadarOpenInstantAddHost = React.memo(function RadarOpenInstantAddHost({
    userId,
    selectedDate,
    show,
    editingEventId,
    onClose,
}: RadarOpenInstantAddHostProps) {
    const [saving, setSaving] = useState(false);
    const editing = userId && editingEventId ? cachedEventById(userId, editingEventId) : null;
    const formData: EventFormData = editing
        ? formFromEvent(editing)
        : { ...EMPTY_FORM, date: selectedDate, time: '' };

    const handleSave = useCallback(
        async (data: EventFormData) => {
            if (saving) return;
            if (!data.title.trim() || !data.date) {
                SmartToast.warning('العنوان والتاريخ مطلوبان');
                return;
            }
            if (!userId) {
                SmartToast.error('يجب تسجيل الدخول لإضافة موعد');
                return;
            }
            setSaving(true);
            try {
                const { saveCalendarEvent, updateCalendarEvent } = await import(
                    '@/app/services/calendar/calendarCloudRuntime'
                );
                const now = new Date().toISOString();
                const fields = mapEventFormToCalendarFields(data);
                if (editing) {
                    const updated: CalendarEvent = {
                        ...editing,
                        ...fields,
                        updatedAt: now,
                    };
                    await updateCalendarEvent(updated);
                    upsertCachedEvent(userId, updated);
                    SmartToast.success('تم تحديث الموعد');
                } else {
                    const created: CalendarEvent = {
                        ...fields,
                        userId,
                        id: newCalendarEventId(),
                        createdAt: now,
                        updatedAt: now,
                    };
                    await saveCalendarEvent(created);
                    upsertCachedEvent(userId, created);
                    SmartToast.success('تم إضافة الموعد');
                }
                onClose();
            } catch {
                SmartToast.error('فشل حفظ الموعد');
            } finally {
                setSaving(false);
            }
        },
        [editing, onClose, saving, userId],
    );

    const handleDelete = useCallback(async () => {
        if (!userId || !editing || saving) return;
        setSaving(true);
        try {
            const { deleteCalendarEvent } = await import('@/app/services/calendar/calendarCloudRuntime');
            await deleteCalendarEvent(editing.id, userId);
            removeCachedEvent(userId, editing.id);
            SmartToast.success('تم حذف الموعد');
            onClose();
        } catch {
            SmartToast.error('فشل حذف الموعد');
        } finally {
            setSaving(false);
        }
    }, [editing, onClose, saving, userId]);

    if (!show) return null;

    prefetchRadarEventForm();

    return (
        <Suspense fallback={<RadarEventFormInstantCover onClose={onClose} />}>
            <EventFormLazy
                show
                onClose={onClose}
                formData={formData}
                editingEvent={
                    editing
                        ? {
                              id: editing.id,
                              title: editing.title,
                              date: editing.date,
                              time: editing.time,
                              type: editing.type,
                              location: editing.location,
                              notes: editing.notes,
                              clientName: editing.clientName,
                              source: 'calendar' as const,
                          }
                        : null
                }
                saving={saving}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </Suspense>
    );
});
