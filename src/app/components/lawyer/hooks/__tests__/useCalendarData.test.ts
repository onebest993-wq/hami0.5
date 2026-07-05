import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarData, buildEventsByDateIndex } from '@/app/components/lawyer/hooks/useCalendarData';
import { CALENDAR_LOCAL_STORAGE_KEY } from '@/app/services/calendar/calendarLocalSnapshot';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const USER = 'lawyer-cal-1';

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    fetchCalendarEvents: vi.fn(),
    saveCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
}));

vi.mock('@/app/services/calendar/bridge/core', () => ({
    resolveCalendarUserId: vi.fn((id: string | null) => id ?? 'guest'),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(() => null),
        getItem: vi.fn(() => Promise.resolve(null)),
        ensurePersistedReady: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('@/app/services/calendar/bridgePersistence/propagate', () => ({
    propagateBridgedCalendarUpdate: vi.fn(),
    propagateBridgedCalendarRemoval: vi.fn(),
}));

import { fetchCalendarEvents } from '@/app/services/calendar/calendarCloudLoader';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { setCachedCalendarEvents, resetCalendarEventsCacheForTests } from '@/app/services/calendar/calendarEventsCache';

describe('useCalendarData — SWR', () => {
    beforeEach(() => {
        localStorage.clear();
        resetCalendarEventsCacheForTests();
        vi.clearAllMocks();
        vi.mocked(resolveCalendarUserId).mockImplementation((id: string | null) => id ?? 'guest');
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('يعرض اللقطة المحلية فوراً دون spinner كامل', async () => {
        localStorage.setItem(
            CALENDAR_LOCAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'local-1',
                    userId: USER,
                    title: 'موعد محلي',
                    date: '2026-06-15',
                    type: 'custom',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );

        vi.mocked(fetchCalendarEvents).mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(
                        () =>
                            resolve([
                                {
                                    id: 'cloud-1',
                                    userId: USER,
                                    title: 'موعد سحابي',
                                    date: '2026-06-16',
                                    type: 'hearing',
                                    createdAt: '2026-01-02T00:00:00.000Z',
                                    updatedAt: '2026-01-02T00:00:00.000Z',
                                },
                            ]),
                        50,
                    );
                }),
        );

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.loading).toBe(false);
        expect(result.current.allEvents.some((e) => e.title === 'موعد محلي')).toBe(true);

        await waitFor(() => {
            expect(result.current.allEvents.some((e) => e.title === 'موعد سحابي')).toBe(true);
        });
        expect(result.current.syncing).toBe(false);
    });

    it('التحديث الخلفي لا يفعّل syncing عند وجود لقطة محلية', async () => {
        localStorage.setItem(
            CALENDAR_LOCAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'local-1',
                    userId: USER,
                    title: 'موعد محلي',
                    date: '2026-06-15',
                    type: 'custom',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );

        let resolveFetch: (value: CalendarEvent[]) => void = () => undefined;
        vi.mocked(fetchCalendarEvents).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
        );

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.syncing).toBe(false);
        expect(result.current.backgroundSyncing).toBe(true);
        expect(result.current.loading).toBe(false);
        expect(result.current.allEvents.some((e) => e.title === 'موعد محلي')).toBe(true);

        await act(async () => {
            resolveFetch([
                {
                    id: 'cloud-1',
                    userId: USER,
                    title: 'موعد سحابي',
                    date: '2026-06-16',
                    type: 'hearing',
                    createdAt: '2026-01-02T00:00:00.000Z',
                    updatedAt: '2026-01-02T00:00:00.000Z',
                },
            ]);
            await Promise.resolve();
        });

        expect(result.current.syncing).toBe(false);
        expect(result.current.backgroundSyncing).toBe(false);
        expect(result.current.allEvents.some((e) => e.title === 'موعد سحابي')).toBe(true);
    });

    it('يستخدم كاش الذاكرة الفارغ بعد warm دون إظهار loading', async () => {
        setCachedCalendarEvents(USER, []);
        vi.mocked(fetchCalendarEvents).mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve([]), 50);
                }),
        );

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.loading).toBe(false);
        expect(result.current.syncing).toBe(false);

        await waitFor(() => {
            expect(fetchCalendarEvents).toHaveBeenCalled();
        });
        expect(result.current.syncing).toBe(false);
    });

    it('debounce تحديث CALENDAR_UPDATED — يقرأ اللقطة المحلية دون fetch إضافي', async () => {
        vi.useFakeTimers();
        try {
            vi.mocked(fetchCalendarEvents).mockResolvedValue([]);

            const { result } = renderHook(() => useCalendarData(USER));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });
            expect(fetchCalendarEvents).toHaveBeenCalledTimes(1);
            expect(result.current.allEvents).toHaveLength(0);

            localStorage.setItem(
                CALENDAR_LOCAL_STORAGE_KEY,
                JSON.stringify([
                    {
                        id: 'evt-1',
                        userId: USER,
                        title: 'موعد محدّث',
                        date: '2026-06-20',
                        type: 'custom',
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: '2026-01-02T00:00:00.000Z',
                    },
                ]),
            );

            act(() => {
                window.dispatchEvent(new Event(CALENDAR_UPDATED_EVENT));
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(300);
            });

            expect(fetchCalendarEvents).toHaveBeenCalledTimes(1);
            expect(result.current.allEvents.some((e) => e.title === 'موعد محدّث')).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('لا يستدعي fetchCalendarEvents عند غياب معرّف المستخدم', async () => {
        vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
        vi.mocked(resolveCalendarUserId).mockReturnValue('');

        const { result } = renderHook(() => useCalendarData(''));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(fetchCalendarEvents).not.toHaveBeenCalled();
        expect(result.current.error).toContain('تسجيل الدخول');
        expect(result.current.allEvents).toHaveLength(0);
    });
});

describe('buildEventsByDateIndex', () => {
    it('يفهرس الأحداث حسب YMD', () => {
        const map = buildEventsByDateIndex(
            [
                {
                    id: '1',
                    title: 'أ',
                    date: '2026-06-01',
                    type: 'custom',
                    source: 'calendar',
                },
                {
                    id: '2',
                    title: 'ب',
                    date: '2026-06-01',
                    type: 'custom',
                    source: 'calendar',
                },
                {
                    id: '3',
                    title: 'ج',
                    date: '2026-07-01',
                    type: 'custom',
                    source: 'calendar',
                },
            ],
            2026,
            5,
        );

        expect(map.get('2026-06-01')).toHaveLength(2);
        expect(map.get('2026-07-01')).toBeUndefined();
    });
});
