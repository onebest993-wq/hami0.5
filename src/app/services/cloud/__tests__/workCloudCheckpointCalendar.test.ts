import { beforeEach, describe, expect, it, vi } from 'vitest';

const calendarDb = vi.hoisted(() => ({
    getAllStoredEvents: vi.fn(async (): Promise<unknown[]> => []),
    saveEventsBatch: vi.fn(async () => undefined),
}));

const tombstones = vi.hoisted(() => ({
    exportTombstoneStoreForCheckpoint: vi.fn(async (): Promise<Record<string, unknown>> => ({})),
    mergeTombstoneStoreFromCheckpoint: vi.fn(async () => 0),
}));

const calendarSurfaces = vi.hoisted(() => ({
    invalidateCalendarEventsCache: vi.fn(),
    notifyCalendarUpdated: vi.fn(),
}));

vi.mock('@/app/services/cloud/lawyerCalendarCloud', () => ({
    CalendarDB: calendarDb,
}));

vi.mock('@/app/services/calendarTombstones', () => ({
    exportTombstoneStoreForCheckpoint: (...args: unknown[]) =>
        tombstones.exportTombstoneStoreForCheckpoint(...args),
    mergeTombstoneStoreFromCheckpoint: (...args: unknown[]) =>
        tombstones.mergeTombstoneStoreFromCheckpoint(...args),
}));

vi.mock('@/app/services/calendar/calendarEventsCache', () => ({
    invalidateCalendarEventsCache: (...args: unknown[]) =>
        calendarSurfaces.invalidateCalendarEventsCache(...args),
}));

vi.mock('@/app/services/calendar/bridge/core', () => ({
    notifyCalendarUpdated: (...args: unknown[]) => calendarSurfaces.notifyCalendarUpdated(...args),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: vi.fn(() => 'u1'),
}));

import {
    applyCalendarCheckpointSlice,
    collectCalendarCheckpointSlice,
    filterCalendarSliceForUser,
    parseCalendarCheckpointSlice,
} from '../workCloudCheckpointCalendar';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';

describe('parseCalendarCheckpointSlice', () => {
    it('يرفض العناصر بلا id/userId ويبقي الشواهد كسجل', () => {
        const parsed = parseCalendarCheckpointSlice({
            calendar: [
                { id: 'ok', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
                { id: 'no-user', title: 'x' },
                null,
            ],
            calendarTombstones: { u1: [{ eventId: 'gone' }] },
        });
        expect(parsed.events).toEqual([{ id: 'ok', userId: 'u1', title: 'جلسة', date: '2026-09-01' }]);
        expect(parsed.tombstones).toEqual({ u1: [{ eventId: 'gone' }] });
    });

    it('لا يُبقي عنوان موعد محذوف داخل نفس الشريحة', () => {
        const parsed = parseCalendarCheckpointSlice({
            calendar: [
                { id: 'live', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
                { id: 'gone', userId: 'u1', title: 'موكل سري', date: '2026-09-02' },
            ],
            calendarTombstones: { u1: [{ eventId: 'gone' }] },
        });
        expect(parsed.events.map((e) => e.id)).toEqual(['live']);
        expect(parsed.events.some((e) => String(e.title).includes('سري'))).toBe(false);
    });

    it('نقطة قديمة بلا تقويم تُفسَّر فارغة', () => {
        expect(parseCalendarCheckpointSlice({})).toEqual({ events: [], tombstones: {} });
    });

    it('يرفض موعداً بلا تاريخ', () => {
        expect(
            parseCalendarCheckpointSlice({
                calendar: [{ id: 'ok', userId: 'u1', title: 'جلسة' }],
            }).events,
        ).toEqual([]);
    });
});

describe('collect / apply calendar checkpoint slice', () => {
    beforeEach(() => {
        calendarDb.getAllStoredEvents.mockReset();
        calendarDb.saveEventsBatch.mockReset();
        tombstones.exportTombstoneStoreForCheckpoint.mockReset();
        tombstones.mergeTombstoneStoreFromCheckpoint.mockReset();
        calendarSurfaces.invalidateCalendarEventsCache.mockReset();
        calendarSurfaces.notifyCalendarUpdated.mockReset();
        calendarDb.getAllStoredEvents.mockResolvedValue([]);
        calendarDb.saveEventsBatch.mockResolvedValue(undefined);
        tombstones.exportTombstoneStoreForCheckpoint.mockResolvedValue({});
        tombstones.mergeTombstoneStoreFromCheckpoint.mockResolvedValue(0);
        vi.mocked(resolveLiveAuthUserIdForStorage).mockReturnValue('u1');
    });

    it('يجمع المواعيد بلا شبكة ويسقط المحذوف قبل التشفير', async () => {
        calendarDb.getAllStoredEvents.mockResolvedValue([
            { id: 'live', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
            { id: 'gone', userId: 'u1', title: 'موكل سري', date: '2026-09-02' },
        ]);
        tombstones.exportTombstoneStoreForCheckpoint.mockResolvedValue({
            u1: [{ eventId: 'gone', deletedAt: '2026-08-01T00:00:00.000Z' }],
        });
        const slice = await collectCalendarCheckpointSlice();
        expect(slice.events.map((e) => e.id)).toEqual(['live']);
        expect(slice.events.some((e) => String(e.title).includes('سري'))).toBe(false);
        expect(calendarDb.getAllStoredEvents).toHaveBeenCalledTimes(1);
    });

    it('لا يعيد إحياء موعد مشهود حذفه عند الاستعادة', async () => {
        tombstones.exportTombstoneStoreForCheckpoint.mockResolvedValue({
            u1: [{ eventId: 'gone', deletedAt: '2026-08-01T00:00:00.000Z' }],
        });
        const count = await applyCalendarCheckpointSlice({
            events: [
                { id: 'live', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
                { id: 'gone', userId: 'u1', title: 'موكل سري', date: '2026-09-02' },
            ],
            tombstones: { u1: [{ eventId: 'gone' }] },
        });
        expect(count).toBe(1);
        expect(tombstones.mergeTombstoneStoreFromCheckpoint).toHaveBeenCalled();
        expect(calendarDb.saveEventsBatch).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'live', title: 'جلسة' }),
        ]);
        const saved = calendarDb.saveEventsBatch.mock.calls[0]?.[0] as Array<{ title?: string }>;
        expect(saved.some((row) => String(row.title).includes('سري'))).toBe(false);
    });

    it('لا يجمع ولا يكتب مواعيد مستخدم آخر على الجهاز', async () => {
        calendarDb.getAllStoredEvents.mockResolvedValue([
            { id: 'mine', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
            { id: 'other', userId: 'u2', title: 'سرّ موكل', date: '2026-09-01' },
        ]);
        tombstones.exportTombstoneStoreForCheckpoint.mockResolvedValue({
            u1: [{ eventId: 'gone-mine' }],
            u2: [{ eventId: 'gone-other' }],
        });
        const collected = await collectCalendarCheckpointSlice();
        expect(collected.events.map((e) => e.id)).toEqual(['mine']);
        expect(collected.tombstones).toEqual({ u1: [{ eventId: 'gone-mine' }] });

        const count = await applyCalendarCheckpointSlice({
            events: [
                { id: 'mine', userId: 'u1', title: 'جلسة', date: '2026-09-01' },
                { id: 'other', userId: 'u2', title: 'سرّ موكل', date: '2026-09-01' },
            ],
            tombstones: {
                u1: [{ eventId: 'gone-mine' }],
                u2: [{ eventId: 'gone-other' }],
            },
        });
        expect(count).toBe(1);
        expect(tombstones.mergeTombstoneStoreFromCheckpoint).toHaveBeenCalledWith({
            u1: [{ eventId: 'gone-mine' }],
        });
        expect(calendarDb.saveEventsBatch).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'mine' }),
        ]);
        const saved = calendarDb.saveEventsBatch.mock.calls[0]?.[0] as Array<{ title?: string }>;
        expect(saved.some((row) => String(row.title).includes('سرّ'))).toBe(false);
    });

    it('بدون هوية حيّة لا تُكتب الشريحة', async () => {
        vi.mocked(resolveLiveAuthUserIdForStorage).mockReturnValueOnce(null);
        const count = await applyCalendarCheckpointSlice({
            events: [{ id: 'mine', userId: 'u1', title: 'جلسة', date: '2026-09-01' }],
            tombstones: { u1: [{ eventId: 'gone' }] },
        });
        expect(count).toBe(0);
        expect(calendarDb.saveEventsBatch).not.toHaveBeenCalled();
        expect(tombstones.mergeTombstoneStoreFromCheckpoint).toHaveBeenCalledWith({});
    });

    it('filterCalendarSliceForUser يُسقط مفاتيح الشواهد الأجنبية', () => {
        const scoped = filterCalendarSliceForUser(
            [
                { id: 'a', userId: 'u1', title: 'جلسة', date: '2026-09-01', type: 'hearing', createdAt: '', updatedAt: '' },
                { id: 'b', userId: 'u2', title: 'x', date: '2026-09-01', type: 'hearing', createdAt: '', updatedAt: '' },
            ],
            { u1: [{ eventId: 'gone' }], u2: [{ eventId: 'x' }] },
            'u1',
        );
        expect(scoped.events.map((e) => e.id)).toEqual(['a']);
        expect(scoped.tombstones).toEqual({ u1: [{ eventId: 'gone' }] });
    });

    it('شواهد فقط — يصفّر كاش العرض بلا كتابة مواعيد', async () => {
        tombstones.exportTombstoneStoreForCheckpoint.mockResolvedValue({
            u1: [{ eventId: 'gone' }],
        });
        const count = await applyCalendarCheckpointSlice({
            events: [],
            tombstones: { u1: [{ eventId: 'gone' }] },
        });
        expect(count).toBe(0);
        expect(calendarDb.saveEventsBatch).not.toHaveBeenCalled();
        expect(calendarSurfaces.invalidateCalendarEventsCache).toHaveBeenCalledWith('u1');
        expect(calendarSurfaces.notifyCalendarUpdated).toHaveBeenCalled();
    });
});
