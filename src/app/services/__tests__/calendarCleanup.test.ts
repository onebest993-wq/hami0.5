import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { saveLawsuitFilesRaw, loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    cleanupCalendarForUser,
    pruneOrphanedBridgeEvents,
    purgeExcludedDossierBridgedEvents,
    purgeInactiveEntityBridgedEvents,
    resetReconcileInFlightForTests,
    syncLawsuitTaskDue,
} from '../calendarDossierSync';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';
import { resetCalendarEventsCacheForTests } from '@/app/services/calendar/calendarEventsCache';
import { flushPendingCalendarSyncs } from '../calendarBridge';
import * as storageHydrationGuard from '@/app/services/dossierPersistence/storageHydrationGuard';
import { resetTombstoneStateForTests } from '@/app/services/calendarTombstones';
import {
    CALENDAR_EVENTS_STORAGE_KEY,
    CALENDAR_TOMBSTONES_STORAGE_KEY,
} from '@/app/services/calendar/calendarStorageKeys';

const USER = 'cleanup-test-user';
const CAL_KEY = 'hami:calendar:events:v1';

describe('calendar cleanup — محذوف ومختلق', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        resetReconcileInFlightForTests();
        // 1) Generic list-based wipe (best-effort)
        SecureStoreService.listKeysSync().forEach((k: string) => SecureStoreService.deleteItemSync(k));
        localStorage.clear();
        // 2) Explicit key purge for calendar — guards against listKeysSync() blind spots (isUnread / legacy mirror)
        SecureStoreService.deleteItemSync(CALENDAR_EVENTS_STORAGE_KEY);
        SecureStoreService.deleteItemSync(CALENDAR_TOMBSTONES_STORAGE_KEY);
        localStorage.removeItem(CALENDAR_EVENTS_STORAGE_KEY);
        localStorage.removeItem(CALENDAR_TOMBSTONES_STORAGE_KEY);
        // 3) Wipe ALL known hami:* storage keys to eliminate cross-module leaks (dossierPersistence / criminal / threading / etc)
        [
            'hami:dossier:lawsuits:v3', 'hami:dossier:executions:v1',
            'hami:criminal:cases:v1', 'hami:threading:transactions:v1',
            'hami:notes:global:v1', 'hami:field-tasks:v1',
            'hami:calendar:sync-cursor:v1', 'hami:calendar:sync-lock:v1',
            'hami:calendar:user-id:v1', 'hami:calendar:discovered-dates:v1',
            'hami:dossier-backup:lawsuits:v1', 'hami:dossier-backup:executions:v1',
            'hami:dossier-meta:v1', 'hami:unread:v1',
        ].forEach((k) => {
            try { SecureStoreService.deleteItemSync(k); } catch { /* ignore */ }
            try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
        // 4) In-memory singleton caches
        resetCalendarEventsCacheForTests();
        saveLawsuitFilesRaw([]);
        const g = globalThis as typeof globalThis & { __hamiCalendarSyncQueue?: unknown };
        delete g.__hamiCalendarSyncQueue;
        resetTombstoneStateForTests();
    });

    it('يزيل مواعيد إضبارة محذوفة من التقويم', async () => {
        const bridgeId = buildStableBridgeId('lawsuit', 'gone', 'appt1');
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: bridgeId,
            userId: USER,
            title: 'جلسة قديمة',
            date: '2026-01-01',
            type: 'hearing',
            sourceModule: 'lawsuit',
            sourceEntityId: 'gone',
            sourceEventId: 'appt1',
            createdAt: now,
            updatedAt: now,
        });

        saveLawsuitFilesRaw([]);
        const removed = await purgeInactiveEntityBridgedEvents(USER);
        expect(removed).toBe(1);

        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e: { id?: string }) => e.id === bridgeId)).toBe(false);
    });

    it('يزيل مهام الاستحقاق التلقائية عند التنظيف الشامل (لا جلسات)', async () => {
        syncLawsuitTaskDue({
            userId: USER,
            fileId: 'f1',
            task: { id: 'auto-task', title: 'مهمة نظام', dueDate: '2026-12-01' },
        });
        await flushPendingCalendarSyncs();

        saveLawsuitFilesRaw([
            {
                id: 'f1',
                status: 'active',
                stages: [{ id: 's1', timeline: [], tasks: [] }],
            },
        ]);

        const pruned = await pruneOrphanedBridgeEvents(USER, { includeTasks: false });
        expect(pruned).toBeGreaterThanOrEqual(1);

        const taskBridgeId = buildStableBridgeId('lawsuit', 'f1', 'task_auto-task');
        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e: { id?: string }) => e.id === taskBridgeId)).toBe(false);
    });

    it('يزيل مواعيد إضبارة مؤرشفة (archived) من التقويم', async () => {
        saveLawsuitFilesRaw([
            {
                id: 'archived-case',
                status: 'archived',
                stages: [
                    {
                        id: 's1',
                        timeline: [
                            {
                                id: 'old-hearing',
                                type: 'appointment',
                                date: '2026-06-01',
                                title: 'جلسة قديمة',
                            },
                        ],
                    },
                ],
            },
        ]);

        const bridgeId = buildStableBridgeId('lawsuit', 'archived-case', 'old-hearing');
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: bridgeId,
            userId: USER,
            title: 'يجب أن تُحذف',
            date: '2026-06-01',
            type: 'hearing',
            sourceModule: 'lawsuit',
            sourceEntityId: 'archived-case',
            sourceEventId: 'old-hearing',
            createdAt: now,
            updatedAt: now,
        });

        const removed = await purgeExcludedDossierBridgedEvents(USER);
        expect(removed).toBeGreaterThanOrEqual(1);

        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e: { id?: string }) => e.id === bridgeId)).toBe(false);
    });

    it('cleanupCalendarForUser يبقي الجلسة الحقيقية فقط', async () => {
        vi.spyOn(storageHydrationGuard, 'shouldSkipDossierDependentCalendarPurge').mockResolvedValue(
            false,
        );

        saveLawsuitFilesRaw([
            {
                id: 'keep',
                status: 'active',
                stages: [
                    {
                        id: 's1',
                        timeline: [
                            {
                                id: 'real-hearing',
                                type: 'appointment',
                                date: '2027-01-15',
                                title: 'جلسة حقيقية',
                            },
                        ],
                    },
                ],
            },
        ]);
        expect((loadLawsuitFilesRaw() as Array<{ id?: string }>).some((f) => String(f.id) === 'keep')).toBe(
            true,
        );

        const ghostId = buildStableBridgeId('lawsuit', 'keep', 'phantom');
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: ghostId,
            userId: USER,
            title: 'يتيم',
            date: '2027-01-16',
            type: 'hearing',
            sourceModule: 'lawsuit',
            sourceEntityId: 'keep',
            sourceEventId: 'phantom',
            createdAt: now,
            updatedAt: now,
        });

        await cleanupCalendarForUser(USER);
        await flushPendingCalendarSyncs();

        resetCalendarEventsCacheForTests();
        const events = await CalendarDB.getEvents(USER);

        expect(events.some((e: { id?: string }) => e.id === ghostId)).toBe(false);
        expect(events.some((e: { id?: string }) => e.id === buildStableBridgeId('lawsuit', 'keep', 'real-hearing'))).toBe(
            true,
        );

        const stored =
            SecureStoreService.getItemSync(CAL_KEY) ?? localStorage.getItem(CAL_KEY);
        expect(stored).toBeTruthy();
    });

    it('getEvents لا يمسح أحداث مستخدم آخر عند مزامنة مستخدم بلا أحداث', async () => {
        const USER_A = 'cleanup-user-a';
        const USER_B = 'cleanup-user-b';
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: 'evt-user-b',
            userId: USER_B,
            title: 'موعد مستخدم ب',
            date: '2026-06-01',
            type: 'custom' as const,
            createdAt: now,
            updatedAt: now,
        });

        const eventsA = await CalendarDB.getEvents(USER_A);
        expect(eventsA).toHaveLength(0);

        const all = await CalendarDB.getAllStoredEvents();
        expect(all.some((e: { id?: string; userId?: string }) => e.id === 'evt-user-b' && e.userId === USER_B)).toBe(true);
    });
});
