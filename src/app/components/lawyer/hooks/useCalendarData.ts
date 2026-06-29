import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CalendarEvent, CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';
import { uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import {
    fetchCalendarEvents,
    saveCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/app/services/calendar/calendarCloudLoader';
import {
    CALENDAR_UPDATED_EVENT,
    isBridgedCalendarEvent,
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
} from '@/app/services/calendarBridge';
import { mapStoredEventsToUnified } from '@/app/components/lawyer/SmartLegalRadar/calendarEventMapping';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { getCachedCalendarEvents } from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { invalidateCalendarEventsCache } from '@/app/services/calendar/calendarEventsCache';
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

const CALENDAR_UPDATE_DEBOUNCE_MS = 300;

function resolveInitialCalendarEvents(userId: string): CalendarEvent[] {
    const cached = getCachedCalendarEvents(userId);
    if (cached && cached.length > 0) return cached;
    return readLocalCalendarSnapshotSync(userId);
}

function toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function buildEventsByDateIndex(
    events: UnifiedEvent[],
    year: number,
    month: number,
): Map<string, UnifiedEvent[]> {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const map = new Map<string, UnifiedEvent[]>();
    for (const e of events) {
        if (!e.date.startsWith(prefix)) continue;
        const bucket = map.get(e.date);
        if (bucket) bucket.push(e);
        else map.set(e.date, [e]);
    }
    return map;
}

export function useCalendarData(userId: string) {
    const effectiveUserId = resolveCalendarUserId(userId || null);
    const initialSnapshot = useMemo(
        () => resolveInitialCalendarEvents(effectiveUserId),
        [effectiveUserId],
    );
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>(initialSnapshot);
    const [loading, setLoading] = useState(initialSnapshot.length === 0);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedOnceRef = useRef(initialSnapshot.length > 0);

    const fetchEvents = useCallback(
        async (options?: { background?: boolean; forceRefresh?: boolean }) => {
            if (!effectiveUserId) {
                setCustomEvents([]);
                setError('يجب تسجيل الدخول لعرض التقويم');
                setLoading(false);
                setSyncing(false);
                return;
            }
            const background = options?.background ?? hasLoadedOnceRef.current;
            if (background) {
                setSyncing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            try {
                const events = await fetchCalendarEvents(effectiveUserId, {
                    forceRefresh: options?.forceRefresh,
                });
                setCustomEvents(events);
            } catch {
                setError('فشل تحميل أحداث التقويم');
            } finally {
                hasLoadedOnceRef.current = true;
                setLoading(false);
                setSyncing(false);
            }
        },
        [effectiveUserId],
    );

    useEffect(() => {
        const snapshot = resolveInitialCalendarEvents(effectiveUserId);
        hasLoadedOnceRef.current = snapshot.length > 0;
        setCustomEvents(snapshot);
        setLoading(snapshot.length === 0);
        setError(null);

        let cancelled = false;
        void (async () => {
            if (cancelled) return;
            await fetchEvents({ background: snapshot.length > 0 });
        })();

        return () => {
            cancelled = true;
        };
    }, [effectiveUserId, fetchEvents]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const onCalendarUpdated = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                invalidateCalendarEventsCache(effectiveUserId);
                void fetchEvents({ background: true, forceRefresh: true });
            }, CALENDAR_UPDATE_DEBOUNCE_MS);
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        };
    }, [fetchEvents, effectiveUserId]);

    const allEvents = useMemo(() => mapStoredEventsToUnified(customEvents), [customEvents]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, UnifiedEvent[]>();
        for (const e of allEvents) {
            const bucket = map.get(e.date);
            if (bucket) bucket.push(e);
            else map.set(e.date, [e]);
        }
        return map;
    }, [allEvents]);

    const getEventsForDate = useCallback(
        (date: Date): UnifiedEvent[] => {
            return eventsByDate.get(toYmd(date)) ?? [];
        },
        [eventsByDate],
    );

    const addEvent = useCallback(
        async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
            if (!effectiveUserId) {
                setError('يجب تسجيل الدخول لإضافة موعد');
                return null;
            }
            const now = new Date().toISOString();
            const newEvent: CalendarEvent = {
                ...event,
                userId: event.userId || effectiveUserId,
                id: uuidv4(),
                createdAt: now,
                updatedAt: now,
            };
            try {
                await saveCalendarEvent(newEvent);
                setCustomEvents((prev) => [...prev, newEvent]);
                return newEvent;
            } catch {
                setError('فشل إضافة الموعد');
                return null;
            }
        },
        [effectiveUserId],
    );

    const updateEvent = useCallback(async (event: CalendarEvent) => {
        const updated = { ...event, updatedAt: new Date().toISOString() };
        try {
            await updateCalendarEvent(updated);
            if (isBridgedCalendarEvent(updated)) {
                await propagateBridgedCalendarUpdate(updated);
            }
            setCustomEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
            return updated;
        } catch {
            setError('فشل تحديث الموعد');
            return null;
        }
    }, []);

    const deleteEvent = useCallback(
        async (eventId: string) => {
            try {
                const existing = customEvents.find((e) => e.id === eventId);
                if (existing && isBridgedCalendarEvent(existing)) {
                    await propagateBridgedCalendarRemoval(existing);
                }
                await deleteCalendarEvent(eventId, effectiveUserId);
                setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
            } catch {
                setError('فشل حذف الموعد');
            }
        },
        [effectiveUserId, customEvents],
    );

    return {
        allEvents,
        customEvents,
        loading,
        syncing,
        error,
        effectiveUserId,
        getEventsForDate,
        addEvent,
        updateEvent,
        deleteEvent,
        refresh: fetchEvents,
    };
}
