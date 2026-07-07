import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CalendarEvent, CalendarEventType } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    fetchCalendarEvents,
    saveCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/app/services/calendar/calendarCloudRuntime';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { isBridgedCalendarEvent } from '@/app/services/calendar/calendarEventAuthorship';
import { mapStoredEventsToUnified } from '@/app/components/lawyer/SmartLegalRadar/calendarEventMapping';
import {
    getCachedCalendarEvents,
    hasCachedCalendarEvents,
    invalidateCalendarEventsCache,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
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
const CALENDAR_FETCH_TIMEOUT_MS = 6_000;
const CALENDAR_SAVE_TIMEOUT_MS = 8_000;

function withCalendarOpTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            window.setTimeout(() => reject(new Error(`${label}:timeout`)), ms);
        }),
    ]);
}

async function fetchCalendarEventsWithTimeout(
    userId: string,
    options?: { forceRefresh?: boolean },
): Promise<CalendarEvent[]> {
    return Promise.race([
        fetchCalendarEvents(userId, options),
        new Promise<CalendarEvent[]>((_, reject) => {
            window.setTimeout(() => reject(new Error('calendar-fetch-timeout')), CALENDAR_FETCH_TIMEOUT_MS);
        }),
    ]);
}

function newCalendarEventId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `cal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function resolveInitialCalendarEvents(userId: string): CalendarEvent[] {
    if (hasCachedCalendarEvents(userId)) {
        return getCachedCalendarEvents(userId) ?? [];
    }
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
    const [syncing, setSyncing] = useState(false);
    const [backgroundSyncing, setBackgroundSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedOnceRef = useRef(true);
    const fetchInFlightRef = useRef(false);

    const fetchEvents = useCallback(
        async (options?: { background?: boolean; forceRefresh?: boolean }) => {
            if (!effectiveUserId) {
                setCustomEvents([]);
                setError('يجب تسجيل الدخول لعرض التقويم');
                setSyncing(false);
                setBackgroundSyncing(false);
                return;
            }
            if (fetchInFlightRef.current && options?.background) return;
            const isBackground = options?.background ?? hasLoadedOnceRef.current;
            if (isBackground) {
                setBackgroundSyncing(true);
            } else {
                setSyncing(true);
            }
            fetchInFlightRef.current = true;
            setError(null);
            try {
                const events = await fetchCalendarEventsWithTimeout(effectiveUserId, {
                    forceRefresh: options?.forceRefresh,
                });
                setCustomEvents(events);
                setCachedCalendarEvents(effectiveUserId, events);
            } catch (err) {
                const snapshot = readLocalCalendarSnapshotSync(effectiveUserId);
                if (snapshot.length > 0) {
                    setCustomEvents(snapshot);
                    setCachedCalendarEvents(effectiveUserId, snapshot);
                } else if (err instanceof Error && err.message === 'calendar-fetch-timeout') {
                    setError(null);
                } else {
                    setError('فشل تحميل أحداث التقويم');
                }
            } finally {
                hasLoadedOnceRef.current = true;
                fetchInFlightRef.current = false;
                setSyncing(false);
                setBackgroundSyncing(false);
            }
        },
        [effectiveUserId],
    );

    const applyLocalSnapshot = useCallback(() => {
        if (!effectiveUserId) return;
        invalidateCalendarEventsCache(effectiveUserId);
        const snapshot = readLocalCalendarSnapshotSync(effectiveUserId);
        setCustomEvents(snapshot);
        setCachedCalendarEvents(effectiveUserId, snapshot);
        hasLoadedOnceRef.current = true;
        if (snapshot.length > 0) {
            setSyncing(false);
            setBackgroundSyncing(false);
        }
    }, [effectiveUserId]);

    useEffect(() => {
        const snapshot = resolveInitialCalendarEvents(effectiveUserId);
        if (!hasCachedCalendarEvents(effectiveUserId)) {
            setCachedCalendarEvents(effectiveUserId, snapshot);
        }
        hasLoadedOnceRef.current = true;
        setCustomEvents(snapshot);
        setSyncing(false);
        setBackgroundSyncing(false);
        setError(null);

        let cancelled = false;
        void (async () => {
            if (cancelled) return;
            await fetchEvents({ background: true });
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
                applyLocalSnapshot();
            }, CALENDAR_UPDATE_DEBOUNCE_MS);
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        };
    }, [applyLocalSnapshot]);

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
                id: newCalendarEventId(),
                createdAt: now,
                updatedAt: now,
            };

            setCustomEvents((prev) => {
                if (prev.some((e) => e.id === newEvent.id)) return prev;
                return [...prev, newEvent];
            });
            invalidateCalendarEventsCache(effectiveUserId);

            try {
                await saveCalendarEvent(newEvent);
                return newEvent;
            } catch {
                setCustomEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
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
                const { propagateBridgedCalendarUpdate } = await import(
                    '@/app/services/calendar/bridgePersistence/propagate'
                );
                await propagateBridgedCalendarUpdate(updated);
            }
            setCustomEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
            invalidateCalendarEventsCache(effectiveUserId);
            return updated;
        } catch {
            setError('فشل تحديث الموعد');
            return null;
        }
    }, [effectiveUserId]);

    const deleteEvent = useCallback(
        async (eventId: string) => {
            try {
                const existing = customEvents.find((e) => e.id === eventId);
                if (existing && isBridgedCalendarEvent(existing)) {
                    const { propagateBridgedCalendarRemoval } = await import(
                        '@/app/services/calendar/bridgePersistence/propagate'
                    );
                    await propagateBridgedCalendarRemoval(existing);
                }
                await deleteCalendarEvent(eventId, effectiveUserId);
                setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
                invalidateCalendarEventsCache(effectiveUserId);
            } catch {
                setError('فشل حذف الموعد');
            }
        },
        [effectiveUserId, customEvents],
    );

    return {
        allEvents,
        customEvents,
        loading: false,
        backgroundSyncing,
        syncing,
        error,
        effectiveUserId,
        getEventsForDate,
        addEvent,
        updateEvent,
        deleteEvent,
        refresh: () => fetchEvents({ background: false, forceRefresh: true }),
    };
}
