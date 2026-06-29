import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CALENDAR_LOCAL_STORAGE_KEY,
    readLocalCalendarSnapshotSync,
    hasLocalCalendarSnapshot,
    mirrorCalendarEventsToLocalStorage,
    clearCalendarEventsLocalStorageMirror,
} from '@/app/services/calendar/calendarLocalSnapshot';

const USER = 'lawyer-test-1';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(() => null),
    },
}));

describe('calendarLocalSnapshot', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(SecureStoreService.getItemSync).mockReturnValue(null);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('يقرأ أحداث المستخدم من localStorage فوراً', () => {
        localStorage.setItem(
            CALENDAR_LOCAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'ev-1',
                    userId: USER,
                    title: 'جلسة',
                    date: '2026-06-01',
                    type: 'hearing',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
                {
                    id: 'ev-other',
                    userId: 'other-user',
                    title: 'موعد آخر',
                    date: '2026-06-02',
                    type: 'custom',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );

        const events = readLocalCalendarSnapshotSync(USER);
        expect(events).toHaveLength(1);
        expect(events[0]?.id).toBe('ev-1');
        expect(hasLocalCalendarSnapshot(USER)).toBe(true);
    });

    it('يستبعد الأحداث المحذوفة (tombstones)', () => {
        localStorage.setItem(
            CALENDAR_LOCAL_STORAGE_KEY,
            JSON.stringify([
                {
                    id: 'ev-deleted',
                    userId: USER,
                    title: 'محذوف',
                    date: '2026-06-01',
                    type: 'custom',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]),
        );
        localStorage.setItem(
            'hami:calendar:tombstones:v1',
            JSON.stringify({
                [USER]: [{ eventId: 'ev-deleted', deletedAt: '2026-01-02T00:00:00.000Z' }],
            }),
        );

        expect(readLocalCalendarSnapshotSync(USER)).toHaveLength(0);
        expect(hasLocalCalendarSnapshot(USER)).toBe(false);
    });

    it('يقرأ من SecureStore sync cache عند غياب localStorage', () => {
        const payload = JSON.stringify([
            {
                id: 'ev-secure',
                userId: USER,
                title: 'من SecureStore',
                date: '2026-06-03',
                type: 'hearing',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        vi.mocked(SecureStoreService.getItemSync).mockImplementation((key: string) => {
            if (key === CALENDAR_LOCAL_STORAGE_KEY) return payload;
            return null;
        });

        const events = readLocalCalendarSnapshotSync(USER);
        expect(events).toHaveLength(1);
        expect(events[0]?.id).toBe('ev-secure');
    });

    it('mirrorCalendarEventsToLocalStorage يكتب مرآة للّقطة الفورية', () => {
        const payload = JSON.stringify([{ id: 'ev-m', userId: USER, title: 'x', date: '2026-06-01', type: 'custom', createdAt: '', updatedAt: '' }]);
        mirrorCalendarEventsToLocalStorage(payload);
        expect(localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY)).toBe(payload);
        clearCalendarEventsLocalStorageMirror();
        expect(localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY)).toBeNull();
    });
});
