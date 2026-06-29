import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarData, buildEventsByDateIndex } from '@/app/components/lawyer/hooks/useCalendarData';
import { CALENDAR_LOCAL_STORAGE_KEY } from '@/app/services/calendar/calendarLocalSnapshot';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge';

const USER = 'lawyer-cal-1';

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    fetchCalendarEvents: vi.fn(),
    saveCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
}));

vi.mock('@/app/services/calendarBridge', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/calendarBridge')>();
    return {
        ...actual,
        resolveCalendarUserId: vi.fn((id: string | null) => id ?? 'guest'),
        propagateBridgedCalendarUpdate: vi.fn(),
        propagateBridgedCalendarRemoval: vi.fn(),
    };
});

import {
    fetchCalendarEvents,
    saveCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/app/services/calendar/calendarCloudLoader';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

describe('useCalendarData — SWR', () => {
    beforeEach(() => {
        localStorage.clear();
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

    it('debounce تحديث CALENDAR_UPDATED', async () => {
        vi.useFakeTimers();
        try {
            vi.mocked(fetchCalendarEvents).mockResolvedValue([]);

            renderHook(() => useCalendarData(USER));

            await act(async () => {
                await vi.runOnlyPendingTimersAsync();
            });
            expect(fetchCalendarEvents).toHaveBeenCalledTimes(1);

            act(() => {
                window.dispatchEvent(new Event(CALENDAR_UPDATED_EVENT));
                window.dispatchEvent(new Event(CALENDAR_UPDATED_EVENT));
                window.dispatchEvent(new Event(CALENDAR_UPDATED_EVENT));
            });

            expect(fetchCalendarEvents).toHaveBeenCalledTimes(1);

            await act(async () => {
                vi.advanceTimersByTime(300);
                await Promise.resolve();
            });

            expect(fetchCalendarEvents).toHaveBeenCalledTimes(2);
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
