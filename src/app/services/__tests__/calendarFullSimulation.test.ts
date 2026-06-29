/**
 * محاكاة E2E كاملة — CalendarDB حقيقي (تخزين محلي) بدون mock لـ saveEvent.
 * يتحقق من المسارات التي يمر بها المحامي فعلياً.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { saveLawsuitFilesRaw, loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import {
    reconcileAllDossierDates,
    removeAllBridgedEventsForEntity,
    syncExecutionFileToCalendar,
    syncLawsuitFileToCalendar,
    syncLawsuitTimelineAppointment,
    syncLawsuitTaskDue,
} from '../calendarDossierSync';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId, flushPendingCalendarSyncs } from '../calendarBridge';
import { isBridgedCalendarEvent } from '../calendarBridgePersistence';

const USER = 'e2e-lawyer-calendar';
const CAL_KEY = 'hami:calendar:events:v1';

function clearStorage(): void {
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    localStorage.clear();
    persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, []);
}

async function flushCalendarSync(): Promise<void> {
    await flushPendingCalendarSyncs();
}

/** sync*FileToCalendar يشغّل IIFE غير متزامن — ننتظر اكتمال purge/reconcile */
async function awaitFileCalendarSync(): Promise<void> {
    await flushPendingCalendarSyncs();
    await new Promise((r) => setTimeout(r, 100));
    await flushPendingCalendarSyncs();
}

function bridgedForLawsuit(events: Awaited<ReturnType<typeof CalendarDB.getEvents>>, fileId: string) {
    return events.filter(
        (e) =>
            isBridgedCalendarEvent(e) &&
            e.sourceModule === 'lawsuit' &&
            String(e.sourceEntityId) === String(fileId),
    );
}

describe('calendar full simulation (real CalendarDB)', () => {
    beforeEach(() => {
        clearStorage();
        saveLawsuitFilesRaw([]);
        saveExecutionFilesRaw([]);
    });

    afterEach(() => {
        clearStorage();
    });

    it('1) إضافة موعد من الإضبارة → يظهر في التقويم', async () => {
        syncLawsuitTimelineAppointment({
            userId: USER,
            fileId: 'file-100',
            event: { id: 'appt-a', date: '2026-10-05', title: 'جلسة أولى' },
            caseNo: '2026/50',
            court: 'بغداد',
        });
        await flushCalendarSync();

        const events = await CalendarDB.getEvents(USER);
        const id = buildStableBridgeId('lawsuit', 'file-100', 'appt-a');
        const found = events.find((e) => e.id === id);
        expect(found).toBeDefined();
        expect(found?.date).toBe('2026-10-05');
        expect(found?.title).toContain('جلسة');
    });

    it('2) مهمة بتاريخ استحقاق → تظهر في التقويم', async () => {
        syncLawsuitTaskDue({
            userId: USER,
            fileId: 'file-200',
            task: { id: 't1', title: 'تقديم مذكرة', dueDate: '2026-11-01' },
            caseNo: '2026/51',
        });
        await flushCalendarSync();

        const events = await CalendarDB.getEvents(USER);
        const id = buildStableBridgeId('lawsuit', 'file-200', 'task_t1');
        expect(events.some((e) => e.id === id && e.date === '2026-11-01')).toBe(true);
    });

    it('3) نقل دعوى للسلة → تُزال مواعيدها من التقويم', async () => {
        const file = {
            id: 'trash-case',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        { id: 'h1', type: 'appointment', date: '2026-12-01', title: 'جلسة' },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);
        syncLawsuitFileToCalendar(file, USER);
        await awaitFileCalendarSync();
        expect(bridgedForLawsuit(await CalendarDB.getEvents(USER), 'trash-case').length).toBe(1);

        await removeAllBridgedEventsForEntity('lawsuit', 'trash-case', USER);
        await flushCalendarSync();

        expect(bridgedForLawsuit(await CalendarDB.getEvents(USER), 'trash-case').length).toBe(0);
    });

    it('4) استرجاع من السلة → تعود المواعيد', async () => {
        const file = {
            id: 'restore-case',
            status: 'deleted',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        { id: 'h2', type: 'appointment', date: '2026-12-10', title: 'جلسة استئناف' },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);
        await removeAllBridgedEventsForEntity('lawsuit', 'restore-case', USER);

        const restored = { ...file, status: 'active' as const, deletedAt: undefined };
        saveLawsuitFilesRaw([restored]);
        syncLawsuitFileToCalendar(restored, USER);
        await awaitFileCalendarSync();

        const events = bridgedForLawsuit(await CalendarDB.getEvents(USER), 'restore-case');
        expect(events.length).toBe(1);
        expect(events[0]?.date).toBe('2026-12-10');
    });

    it('5) أرشفة دعوى → تُزال مواعيدها', async () => {
        const active = {
            id: 'arch-case',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [{ id: 'h3', type: 'appointment', date: '2027-01-01', title: 'جلسة' }],
                },
            ],
        };
        saveLawsuitFilesRaw([active]);
        syncLawsuitFileToCalendar(active, USER);
        await awaitFileCalendarSync();
        expect(bridgedForLawsuit(await CalendarDB.getEvents(USER), 'arch-case').length).toBe(1);

        const archived = { ...active, status: 'archived' as const };
        saveLawsuitFilesRaw([archived]);
        syncLawsuitFileToCalendar(archived, USER);
        await awaitFileCalendarSync();

        expect(bridgedForLawsuit(await CalendarDB.getEvents(USER), 'arch-case').length).toBe(0);
    });

    it('6) reconcile يزيل اليتامى ويبقي المواعيد الحقيقية', async () => {
        saveLawsuitFilesRaw([
            {
                id: 'live-1',
                stages: [
                    {
                        id: 's1',
                        timeline: [
                            { id: 'real', type: 'appointment', date: '2027-02-01', title: 'حقيقي' },
                        ],
                    },
                ],
            },
        ]);

        const orphanId = buildStableBridgeId('lawsuit', 'live-1', 'phantom');
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: orphanId,
            userId: USER,
            title: 'يتيم',
            date: '2027-02-02',
            type: 'hearing',
            sourceModule: 'lawsuit',
            sourceEntityId: 'live-1',
            sourceEventId: 'phantom',
            createdAt: now,
            updatedAt: now,
        });

        const manualId = 'manual-note-1';
        await CalendarDB.saveEvent({
            id: manualId,
            userId: USER,
            title: 'موعد يدوي',
            date: '2027-03-01',
            type: 'consultation',
            createdAt: now,
            updatedAt: now,
        });

        const stats = await reconcileAllDossierDates(USER);
        const events = await CalendarDB.getEvents(USER);

        expect(stats.prunedOrphans).toBeGreaterThanOrEqual(1);
        expect(events.some((e) => e.id === orphanId)).toBe(false);
        expect(events.some((e) => e.id === buildStableBridgeId('lawsuit', 'live-1', 'real'))).toBe(true);
        expect(events.some((e) => e.id === manualId)).toBe(true);
    });

    it('7) تنفيذ: موعد خط زمني → يظهر ثم يُحذف مع السلة', async () => {
        const exec = {
            id: 'exec-1',
            timelineEvents: [
                {
                    id: 'ex-appt',
                    type: 'appointment',
                    date: '2027-04-15',
                    title: 'موعد تنفيذ',
                },
            ],
        };
        saveExecutionFilesRaw([exec]);
        syncExecutionFileToCalendar(exec, USER);
        await awaitFileCalendarSync();

        let events = await CalendarDB.getEvents(USER);
        const exId = buildStableBridgeId('execution', 'exec-1', 'ex-appt');
        expect(events.some((e) => e.id === exId)).toBe(true);

        const trashed = { ...exec, executionTrashDeletedAt: new Date().toISOString() };
        saveExecutionFilesRaw([trashed]);
        syncExecutionFileToCalendar(trashed, USER);
        await awaitFileCalendarSync();

        events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === exId)).toBe(false);
    });

    it('8) مراحل متعددة — كل الجلسات تُرفع', async () => {
        const file = {
            id: 'multi-stage',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        { id: 'a1', type: 'appointment', date: '2027-05-01', title: 'أولى' },
                    ],
                },
                {
                    id: 's2',
                    timeline: [
                        { id: 'a2', type: 'appointment', date: '2027-06-01', title: 'استئناف' },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);
        const stats = await reconcileAllDossierDates(USER);
        expect(stats.lawsuitAppointments).toBe(2);

        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === buildStableBridgeId('lawsuit', 'multi-stage', 'a1'))).toBe(true);
        expect(events.some((e) => e.id === buildStableBridgeId('lawsuit', 'multi-stage', 'a2'))).toBe(true);
    });

    it('9) حفظ إضبارة يحدّث التخزين ويُبقي المزامنة متسقة', async () => {
        const file = {
            id: 'persist-1',
            status: 'active',
            caseNo: '2027/1',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        { id: 'p1', type: 'appointment', date: '2027-07-01', title: 'جلسة' },
                    ],
                },
            ],
        };
        persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, [file]);
        saveLawsuitFilesRaw([file]);
        syncLawsuitFileToCalendar(file, USER);
        await awaitFileCalendarSync();

        expect(loadLawsuitFilesRaw().length).toBe(1);
        const stored = localStorage.getItem(CAL_KEY) || SecureStoreService.getItemSync(CAL_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(String(stored)) as unknown[];
        expect(Array.isArray(parsed) && parsed.length > 0).toBe(true);
    });
});
