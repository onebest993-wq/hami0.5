import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarData, buildEventsByDateIndex, calendarEventSetsEqual } from '@/app/components/lawyer/hooks/useCalendarData';
import { CALENDAR_LOCAL_STORAGE_KEY, readLocalCalendarSnapshotSync } from '@/app/services/calendar/calendarLocalSnapshot';
import {
    CALENDAR_BACKGROUND_SYNC_FAILED_EVENT,
    CALENDAR_UPDATED_EVENT,
} from '@/app/services/calendarBridge.types';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

const USER = 'lawyer-cal-1';

vi.mock('@/app/services/calendar/calendarCloudRuntime', () => ({
    fetchCalendarEvents: vi.fn(),
    saveCalendarEvent: vi.fn(),
    updateCalendarEvent: vi.fn(),
    deleteCalendarEvent: vi.fn(),
}));

const resolveCalendarUserIdMock = vi.hoisted(() =>
    vi.fn((id: string | null) => (id && String(id).trim()) || 'guest'),
);

vi.mock('@/app/services/calendar/bridge/core', () => ({
    resolveCalendarUserId: (...args: [string | null]) => resolveCalendarUserIdMock(...args),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: (key: string) => {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        setItemSync: (key: string, value: string) => {
            localStorage.setItem(key, value);
        },
        isUnreadSync: () => false,
        getItem: async (key: string) => {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        ensurePersistedReady: () => Promise.resolve(),
    },
}));

vi.mock('@/app/services/calendar/bridgePersistence/propagate', () => ({
    propagateBridgedCalendarUpdate: vi.fn(),
    propagateBridgedCalendarRemoval: vi.fn(),
}));

vi.mock('@/app/services/calendar/calendarEventsWarm', () => ({
    awaitCalendarWarmIfInflight: vi.fn(() => Promise.resolve()),
}));

import {
    fetchCalendarEvents,
    saveCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from '@/app/services/calendar/calendarCloudRuntime';
import { setCachedCalendarEvents, resetCalendarEventsCacheForTests } from '@/app/services/calendar/calendarEventsCache';

describe('useCalendarData — SWR', () => {
    beforeEach(() => {
        localStorage.clear();
        resetCalendarEventsCacheForTests();
        vi.clearAllMocks();
        resolveCalendarUserIdMock.mockImplementation((id: string | null) =>
            (id && String(id).trim()) || 'guest',
        );
    });

    afterEach(() => {
        localStorage.clear();
        vi.useRealTimers();
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

        const localSnapshot = readLocalCalendarSnapshotSync(USER);
        expect(localSnapshot.some((e) => e.title === 'موعد محلي')).toBe(true);
        setCachedCalendarEvents(USER, localSnapshot);

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.effectiveUserId).toBe(USER);
        expect(result.current.loading).toBe(false);
        expect(result.current.customEvents.map((e) => e.title)).toEqual(['موعد محلي']);
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

        const localSnapshot = readLocalCalendarSnapshotSync(USER);
        expect(localSnapshot.some((e) => e.title === 'موعد محلي')).toBe(true);
        setCachedCalendarEvents(USER, localSnapshot);

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.syncing).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(result.current.customEvents.some((e) => e.title === 'موعد محلي')).toBe(true);
        expect(result.current.allEvents.some((e) => e.title === 'موعد محلي')).toBe(true);

        await waitFor(() => {
            expect(result.current.backgroundSyncing).toBe(true);
        });

        await waitFor(() => {
            expect(fetchCalendarEvents).toHaveBeenCalled();
        });

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
        });

        await waitFor(() => {
            expect(result.current.backgroundSyncing).toBe(false);
        });
        expect(result.current.syncing).toBe(false);
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

    it('لا يعيد بناء القائمة عند جلب خلفي بلا تغيّر في الأحداث', async () => {
        const events: CalendarEvent[] = [
            {
                id: 'evt-1',
                userId: USER,
                title: 'موعد',
                date: '2026-06-15',
                type: 'custom',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];
        setCachedCalendarEvents(USER, events);
        vi.mocked(fetchCalendarEvents).mockResolvedValue(events);

        const { result } = renderHook(() => useCalendarData(USER));
        const before = result.current.allEvents;

        await waitFor(() => {
            expect(fetchCalendarEvents).toHaveBeenCalled();
        });

        expect(result.current.allEvents).toBe(before);
    });

    it('لا يستدعي fetchCalendarEvents عند غياب معرّف المستخدم', async () => {
        vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
        resolveCalendarUserIdMock.mockReturnValue('');

        const { result } = renderHook(() => useCalendarData(''));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(fetchCalendarEvents).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
        expect(result.current.allEvents).toHaveLength(0);
    });

    it('يعلن فشل مزامنة الجسر الخلفية بدل الصمت', async () => {
        vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
        const { result } = renderHook(() => useCalendarData(USER));

        await waitFor(() => {
            expect(fetchCalendarEvents).toHaveBeenCalled();
        });

        act(() => {
            window.dispatchEvent(new CustomEvent(CALENDAR_BACKGROUND_SYNC_FAILED_EVENT));
        });

        expect(result.current.error).toBe('تعذّر تحديث التقويم');
    });

    it('يلغي الإضافة المعلّقة بعد مهلة الحفظ ويعيد القائمة', async () => {
        vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
        vi.mocked(saveCalendarEvent).mockImplementation(() => new Promise(() => {}));
        const { result } = renderHook(() => useCalendarData(USER));
        await waitFor(() => {
            expect(fetchCalendarEvents).toHaveBeenCalled();
        });

        vi.useFakeTimers();
        try {
            let created: CalendarEvent | null | undefined;
            await act(async () => {
                const pending = result.current.addEvent({
                    userId: USER,
                    title: 'موعد معلّق',
                    date: '2026-06-15',
                    type: 'custom',
                });
                void pending.then((value) => {
                    created = value;
                });
            });
            expect(result.current.allEvents.some((event) => event.title === 'موعد معلّق')).toBe(true);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(8_000);
            });

            expect(created).toBeNull();
            expect(result.current.error).toBe('تعذّر حفظ الموعد');
            expect(result.current.allEvents.some((event) => event.title === 'موعد معلّق')).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('يفشل التحديث المعلّق بعد المهلة دون إعلان نجاح', async () => {
        const existing: CalendarEvent = {
            id: 'evt-hang',
            userId: USER,
            title: 'موعد',
            date: '2026-06-15',
            type: 'custom',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        setCachedCalendarEvents(USER, [existing]);
        vi.mocked(fetchCalendarEvents).mockResolvedValue([existing]);
        vi.mocked(updateCalendarEvent).mockImplementation(() => new Promise(() => {}));
        const { result } = renderHook(() => useCalendarData(USER));
        await waitFor(() => {
            expect(result.current.customEvents.some((event) => event.id === 'evt-hang')).toBe(true);
        });

        vi.useFakeTimers();
        try {
            let updated: CalendarEvent | null | undefined;
            await act(async () => {
                const pending = result.current.updateEvent({ ...existing, title: 'موعد معلّق' });
                void pending.then((value) => {
                    updated = value;
                });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(8_000);
            });
            expect(updated).toBeNull();
            expect(result.current.error).toBe('تعذّر حفظ الموعد');
        } finally {
            vi.useRealTimers();
        }
    });

    it('يفشل الحذف المعلّق بعد المهلة', async () => {
        const existing: CalendarEvent = {
            id: 'evt-del',
            userId: USER,
            title: 'موعد',
            date: '2026-06-15',
            type: 'custom',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        setCachedCalendarEvents(USER, [existing]);
        vi.mocked(fetchCalendarEvents).mockResolvedValue([existing]);
        vi.mocked(deleteCalendarEvent).mockImplementation(() => new Promise(() => {}));
        const { result } = renderHook(() => useCalendarData(USER));
        await waitFor(() => {
            expect(result.current.customEvents.some((event) => event.id === 'evt-del')).toBe(true);
        });

        vi.useFakeTimers();
        try {
            let removed: boolean | undefined;
            await act(async () => {
                const pending = result.current.deleteEvent('evt-del');
                void pending.then((value) => {
                    removed = value;
                });
            });
            await act(async () => {
                await vi.advanceTimersByTimeAsync(8_000);
            });
            expect(removed).toBe(false);
            expect(result.current.error).toBe('تعذّر حفظ الموعد');
            expect(result.current.customEvents.some((event) => event.id === 'evt-del')).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('calendarEventSetsEqual', () => {
    it('يعتبر القوائم متطابقة عند تطابق id و updatedAt', () => {
        const a: CalendarEvent[] = [
            {
                id: '1',
                userId: USER,
                title: 'أ',
                date: '2026-06-01',
                type: 'custom',
                createdAt: 'x',
                updatedAt: 'v1',
            },
        ];
        const b: CalendarEvent[] = [{ ...a[0], title: 'ب' }];
        expect(calendarEventSetsEqual(a, b)).toBe(true);
        expect(calendarEventSetsEqual(a, [{ ...a[0], updatedAt: 'v2' }])).toBe(false);
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

    it('لا ينهار عند موعد بلا تاريخ', () => {
        const map = buildEventsByDateIndex(
            [
                {
                    id: '1',
                    title: 'صالح',
                    date: '2026-06-01',
                    type: 'custom',
                    source: 'calendar',
                },
                {
                    id: '2',
                    title: 'فاسد',
                    date: undefined as unknown as string,
                    type: 'custom',
                    source: 'calendar',
                },
            ],
            2026,
            5,
        );
        expect(map.get('2026-06-01')).toHaveLength(1);
        expect(map.size).toBe(1);
    });

    it('لا يُبقي مواعيد المحامي السابق عند تبديل الحساب', async () => {
        const other = 'lawyer-cal-2';
        localStorage.setItem(
            CALENDAR_LOCAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'secret-a',
                    userId: USER,
                    title: 'سر المحامي السابق',
                    date: '2026-06-15',
                    type: 'custom',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );
        setCachedCalendarEvents(USER, readLocalCalendarSnapshotSync(USER));
        vi.mocked(fetchCalendarEvents).mockResolvedValue([]);

        const { result, rerender } = renderHook(({ uid }: { uid: string }) => useCalendarData(uid), {
            initialProps: { uid: USER },
        });

        expect(result.current.customEvents.map((e) => e.title)).toEqual(['سر المحامي السابق']);

        rerender({ uid: other });

        await waitFor(() => {
            expect(result.current.effectiveUserId).toBe(other);
            expect(result.current.customEvents).toEqual([]);
        });
    });

    it('كاش ذاكرة فارغ لا يخفي leftover على القرص', async () => {
        const leftover = {
            id: 'leftover-1',
            userId: USER,
            title: 'موعد leftover',
            date: '2026-06-15',
            type: 'custom' as const,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        localStorage.setItem(CALENDAR_LOCAL_STORAGE_KEY, JSON.stringify([leftover]));
        setCachedCalendarEvents(USER, []);
        vi.mocked(fetchCalendarEvents).mockResolvedValue([leftover]);

        const { result } = renderHook(() => useCalendarData(USER));

        expect(result.current.customEvents.map((e) => e.title)).toEqual(['موعد leftover']);
        expect(result.current.loading).toBe(false);
        await waitFor(() => {
            expect(result.current.customEvents.map((e) => e.title)).toEqual(['موعد leftover']);
        });
    });
});
