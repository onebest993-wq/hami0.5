import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CalendarDB, CalendarEvent, CalendarEventType, uuidv4 } from '@/app/services/lawyer-cloud';
import {
    CALENDAR_UPDATED_EVENT,
    isBridgedCalendarEvent,
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
} from '@/app/services/calendarBridge';
import { cleanupCalendarForUser } from '@/app/services/calendarDossierSync';
import { isUserAuthoredBridgedCalendarEvent } from '@/app/services/calendarAuthenticity';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';

export type UnifiedEventBridge = {
    sourceModule: CalendarSourceModule;
    sourceEntityId: string;
    sourceEventId: string;
    calendarRecordId: string;
};

export type UnifiedEvent = {
    id: string;
    title: string;
    date: string;
    time?: string;
    type: CalendarEventType;
    location?: string;
    notes?: string;
    clientName?: string;
    clientPhone?: string;
    revenue?: string;
    caseNo?: string;
    isCompleted?: boolean;
    source: 'deadline' | 'hearing' | 'calendar';
    isBridged?: boolean;
    bridge?: UnifiedEventBridge;
};

function toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isSameDay(dateStr: string, targetDate: Date): boolean {
    return dateStr === toYmd(targetDate);
}

export function useCalendarData(userId: string) {
    const effectiveUserId = resolveCalendarUserId(userId || null);
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // يمنع وميض «جاري التحميل» عند كل تحديث خارجي (CALENDAR_UPDATED_EVENT)
    const hasLoadedOnceRef = useRef(false);

    const fetchEvents = useCallback(async (options?: { skipLoading?: boolean }) => {
        const showLoading = !options?.skipLoading && !hasLoadedOnceRef.current;
        if (showLoading) {
            setLoading(true);
        }
        setError(null);
        try {
            const events = await CalendarDB.getEvents(effectiveUserId);
            setCustomEvents(events);
        } catch {
            setError('فشل تحميل أحداث التقويم');
        } finally {
            hasLoadedOnceRef.current = true;
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [effectiveUserId]);

    useEffect(() => {
        // عند تغيّر المحامي، نُعيد ضبط «التحميل لأول مرة»
        hasLoadedOnceRef.current = false;
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                await cleanupCalendarForUser(effectiveUserId);
                if (!cancelled) {
                    const events = await CalendarDB.getEvents(effectiveUserId);
                    setCustomEvents(events);
                }
            } catch {
                if (!cancelled) setError('فشل تحميل أحداث التقويم');
            } finally {
                if (!cancelled) {
                    hasLoadedOnceRef.current = true;
                    setLoading(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [effectiveUserId]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onCalendarUpdated = () => {
            // التحديثات الخارجية لا تُومض شاشة التحميل
            void fetchEvents({ skipLoading: true });
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
    }, [fetchEvents]);

    const allEvents = useMemo((): UnifiedEvent[] => {
        const result: UnifiedEvent[] = [];

        // أحداث CalendarDB فقط (مربوطة فعلياً من الأقسام أو مُدخلة يدوياً في التقويم)
        for (const e of customEvents) {
            if (!isUserAuthoredBridgedCalendarEvent(e)) continue;
            const bridged = isBridgedCalendarEvent(e);
            result.push({
                id: `cal_${e.id}`,
                title: e.title,
                date: e.date,
                time: e.time,
                type: e.type,
                location: e.location,
                notes: e.notes,
                clientName: e.clientName,
                clientPhone: e.clientPhone,
                revenue: e.revenue,
                caseNo: e.caseNo,
                isCompleted: e.isCompleted,
                source: 'calendar',
                isBridged: bridged,
                bridge:
                    bridged && e.sourceModule && e.sourceEntityId && e.sourceEventId
                        ? {
                              sourceModule: e.sourceModule,
                              sourceEntityId: e.sourceEntityId,
                              sourceEventId: e.sourceEventId,
                              calendarRecordId: e.id,
                          }
                        : undefined,
            });
        }

        return result;
    }, [customEvents]);

    const getEventsForDate = useCallback(
        (date: Date): UnifiedEvent[] => {
            return allEvents.filter((e) => isSameDay(e.date, date));
        },
        [allEvents]
    );

    const getDatesWithEvents = useCallback(
        (year: number, month: number): number[] => {
            const days = new Set<number>();
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            for (const e of allEvents) {
                if (e.date.startsWith(prefix)) {
                    const day = parseInt(e.date.split('-')[2], 10);
                    if (!isNaN(day)) days.add(day);
                }
            }
            return Array.from(days).sort((a, b) => a - b);
        },
        [allEvents]
    );

    const addEvent = useCallback(
        async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
            const now = new Date().toISOString();
            const newEvent: CalendarEvent = {
                ...event,
                userId: event.userId || effectiveUserId,
                id: uuidv4(),
                createdAt: now,
                updatedAt: now,
            };
            try {
                await CalendarDB.saveEvent(newEvent);
                setCustomEvents((prev) => [...prev, newEvent]);
                return newEvent;
            } catch {
                setError('فشل إضافة الموعد');
                return null;
            }
        },
        [effectiveUserId]
    );

    const updateEvent = useCallback(
        async (event: CalendarEvent) => {
            const updated = { ...event, updatedAt: new Date().toISOString() };
            try {
                await CalendarDB.updateEvent(updated);
                if (isBridgedCalendarEvent(updated)) {
                    await propagateBridgedCalendarUpdate(updated);
                }
                setCustomEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
                return updated;
            } catch {
                setError('فشل تحديث الموعد');
                return null;
            }
        },
        []
    );

    const deleteEvent = useCallback(
        async (eventId: string) => {
            try {
                const existing = customEvents.find((e) => e.id === eventId);
                if (existing && isBridgedCalendarEvent(existing)) {
                    await propagateBridgedCalendarRemoval(existing);
                }
                await CalendarDB.deleteEvent(eventId, effectiveUserId);
                setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
            } catch {
                setError('فشل حذف الموعد');
            }
        },
        [effectiveUserId, customEvents]
    );

    return {
        allEvents,
        customEvents,
        loading,
        error,
        effectiveUserId,
        getEventsForDate,
        getDatesWithEvents,
        addEvent,
        updateEvent,
        deleteEvent,
        refresh: fetchEvents,
    };
}
