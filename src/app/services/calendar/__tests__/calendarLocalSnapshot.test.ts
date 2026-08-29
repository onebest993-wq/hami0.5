import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CALENDAR_LOCAL_STORAGE_KEY,
    readLocalCalendarSnapshotSync,
    hasLocalCalendarSnapshot,
    mirrorCalendarEventsToLocalStorage,
    clearCalendarEventsLocalStorageMirror,
} from '@/app/services/calendar/calendarLocalSnapshot';
import { BOOT_SHELL_WARM_KEYS } from '@/app/services/dossierPersistence/protectedStorageKeys';

const USER = 'lawyer-test-1';

const secureMem = vi.hoisted(() => new Map<string, string>());

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn((key: string) => secureMem.get(key) ?? null),
        setItemSync: vi.fn((key: string, value: string) => {
            secureMem.set(key, value);
            return true;
        }),
    },
}));

describe('calendarLocalSnapshot', () => {
    beforeEach(() => {
        secureMem.clear();
        localStorage.clear();
        vi.mocked(SecureStoreService.getItemSync).mockClear();
        vi.mocked(SecureStoreService.setItemSync).mockClear();
    });

    afterEach(() => {
        localStorage.clear();
        secureMem.clear();
    });

    it('يرحّل أحداث المستخدم من localStorage ثم يمحو المرآة', () => {
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
        expect(localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY)).toBeNull();
        expect(secureMem.get(CALENDAR_LOCAL_STORAGE_KEY)).toBeTruthy();
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
        expect(localStorage.getItem('hami:calendar:tombstones:v1')).toBeNull();
        expect(secureMem.get('hami:calendar:tombstones:v1')).toBeTruthy();
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
        secureMem.set(CALENDAR_LOCAL_STORAGE_KEY, payload);

        const events = readLocalCalendarSnapshotSync(USER);
        expect(events).toHaveLength(1);
        expect(events[0]?.id).toBe('ev-secure');
    });

    it('مفتاح التقويم وشواهد القبر في قشرة الإقلاع — رادار الرئيسية يقرأ لقطة متزامنة', () => {
        expect([...BOOT_SHELL_WARM_KEYS]).toContain(CALENDAR_LOCAL_STORAGE_KEY);
        expect([...BOOT_SHELL_WARM_KEYS]).toContain('hami:calendar:tombstones:v1');
    });

    it('mirrorCalendarEventsToLocalStorage يمحو المرآة الصريحة ولا يكتبها', () => {
        const payload = JSON.stringify([
            { id: 'ev-m', userId: USER, title: 'x', date: '2026-06-01', type: 'custom', createdAt: '', updatedAt: '' },
        ]);
        localStorage.setItem(CALENDAR_LOCAL_STORAGE_KEY, payload);
        mirrorCalendarEventsToLocalStorage(payload);
        expect(localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY)).toBeNull();
        clearCalendarEventsLocalStorageMirror();
        expect(localStorage.getItem(CALENDAR_LOCAL_STORAGE_KEY)).toBeNull();
    });
});
