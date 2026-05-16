import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCaseStore } from '@/app/stores/caseStore';
import { CalendarDB, CalendarEvent, CalendarEventType, uuidv4 } from '@/app/services/lawyer-cloud';

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
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cases = useCaseStore((s) => s.cases);

    const fetchEvents = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const events = await CalendarDB.getEvents(userId);
            setCustomEvents(events);
        } catch {
            setError('فشل تحميل أحداث التقويم');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const allEvents = useMemo((): UnifiedEvent[] => {
        const result: UnifiedEvent[] = [];

        // 1. Deadlines from caseStore
        for (const c of cases) {
            if (c.status === 'deleted') continue;
            for (const d of c.deadlines || []) {
                if (d.isDeleted) continue;
                result.push({
                    id: `deadline_${d.id}`,
                    title: d.title,
                    date: d.date,
                    type: 'deadline',
                    caseNo: c.caseNo,
                    isCompleted: d.isCompleted,
                    source: 'deadline',
                });
            }
        }

        // 2. Hearings from caseStore
        for (const c of cases) {
            if (c.status === 'deleted') continue;
            for (const h of c.timeline || []) {
                if (h.isDeleted) continue;
                result.push({
                    id: `hearing_${h.id}`,
                    title: h.title,
                    date: h.date,
                    type: 'hearing',
                    location: c.court,
                    notes: h.notes,
                    caseNo: c.caseNo,
                    source: 'hearing',
                });
            }
        }

        // 3. Custom events from CalendarDB
        for (const e of customEvents) {
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
            });
        }

        return result;
    }, [cases, customEvents]);

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
        []
    );

    const updateEvent = useCallback(
        async (event: CalendarEvent) => {
            const updated = { ...event, updatedAt: new Date().toISOString() };
            try {
                await CalendarDB.updateEvent(updated);
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
                await CalendarDB.deleteEvent(eventId, userId);
                setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
            } catch {
                setError('فشل حذف الموعد');
            }
        },
        [userId]
    );

    return {
        allEvents,
        customEvents,
        loading,
        error,
        getEventsForDate,
        getDatesWithEvents,
        addEvent,
        updateEvent,
        deleteEvent,
        refresh: fetchEvents,
    };
}
