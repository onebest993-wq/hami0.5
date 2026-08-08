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
import { mapStoredEventsToUnified, mapAllCalendarEventsForSparkScan } from '@/app/components/lawyer/SmartLegalRadar/calendarEventMapping';
import {
    getCachedCalendarEvents,
    hasCachedCalendarEvents,
    invalidateCalendarEventsCache,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import { readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import { awaitCalendarWarmIfInflight } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
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
    endTime?: string;
    durationMinutes?: number;
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
    /** حقول عرض مشتقة — من notes أو جسر التقويم */
    court?: string;
    partiesSummary?: string;
    sourceLabel?: string;
    reminderMinutesBefore?: number | null;
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

/** يمنع إعادة رسم القائمة عند جلب/مزامنة بلا تغيّر فعلي في الأحداث */
export function calendarEventSetsEqual(a: CalendarEvent[], b: CalendarEvent[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    const updatedById = new Map(b.map((e) => [e.id, e.updatedAt]));
    for (const e of a) {
        if (updatedById.get(e.id) !== e.updatedAt) return false;
    }
    return true;
}

function adoptCalendarEventsIfChanged(prev: CalendarEvent[], next: CalendarEvent[]): CalendarEvent[] {
    return calendarEventSetsEqual(prev, next) ? prev : next;
}

function resolveInitialCalendarEvents(userId: string): CalendarEvent[] {
    if (hasCachedCalendarEvents(userId)) {
        return getCachedCalendarEvents(userId) ?? [];
    }
    return readLocalCalendarSnapshotSync(userId);
}

/** لمسح سبارك على الرئيسية — يشمل مواعيد الجسر الآلي */
export function resolveUnifiedCalendarEventsForScan(userId: string): UnifiedEvent[] {
    const uid = String(userId ?? '').trim();
    if (!uid) return [];
    return mapAllCalendarEventsForSparkScan(resolveInitialCalendarEvents(uid));
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
    const fetchRequestIdRef = useRef(0);

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
            const requestId = ++fetchRequestIdRef.current;
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
                if (requestId !== fetchRequestIdRef.current) return;
                setCustomEvents((prev) => adoptCalendarEventsIfChanged(prev, events));
                setCachedCalendarEvents(effectiveUserId, events);
            } catch (err) {
                if (requestId !== fetchRequestIdRef.current) return;
                const snapshot = readLocalCalendarSnapshotSync(effectiveUserId);
                if (snapshot.length > 0) {
                    setCustomEvents((prev) => adoptCalendarEventsIfChanged(prev, snapshot));
                    setCachedCalendarEvents(effectiveUserId, snapshot);
                } else if (err instanceof Error && err.message === 'calendar-fetch-timeout') {
                    setError(null);
                } else {
                    setError('فشل تحميل أحداث التقويم');
                }
            } finally {
                if (requestId !== fetchRequestIdRef.current) return;
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
        setCustomEvents((prev) => adoptCalendarEventsIfChanged(prev, snapshot));
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
            await awaitCalendarWarmIfInflight(effectiveUserId);
            if (cancelled) return;
            await fetchEvents({ background: true });
        })();

        return () => {
            cancelled = true;
            fetchRequestIdRef.current += 1;
            fetchInFlightRef.current = false;
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

    /** مسح سبارك/تضارب — كل الأحداث غير المكتملة بما فيها الجسر الآلي */
    const sparkScanEvents = useMemo(
        () => mapAllCalendarEventsForSparkScan(customEvents),
        [customEvents],
    );

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
        sparkScanEvents,
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
