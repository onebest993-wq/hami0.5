/**
 * فحص عقدي مجهري — يوثّق ويختبر «فكرة ربط التقويم» كاملة.
 *
 * العقد:
 * 1) كل موعد مربوط له معرّف ثابت: hami_bridge_{module}_{entityId}_{sourceEventId}
 * 2) المصدر هو الحقيقة — التقويم مرآة للإضابير النشطة فقط
 * 3) أرشيف/سلة/محذوف → لا يظهر ويُمسح تلقائياً
 * 4) المواعيد اليدوية (بدون sourceModule) لا تُمسح بالتنظيف
 * 5) المزامنة الشاملة ترفع مهام المستخدم فقط (تستثني task_fast_/auto_)
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';
import { isBridgedCalendarEvent } from '../calendarBridgePersistence';
import {
    cleanupCalendarForUser,
    purgeExcludedDossierBridgedEvents,
    reconcileAllDossierDates,
    shouldExcludeExecutionFromCalendar,
    shouldExcludeLawsuitFromCalendar,
    syncLawsuitTimelineAppointment,
} from '../calendarDossierSync';

const USER = 'contract-audit-user';

function clearAll(): void {
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    localStorage.clear();
    saveLawsuitFilesRaw([]);
    saveExecutionFilesRaw([]);
}

function wait(ms = 130): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

describe('calendar contract audit — فحص مجهري للربط', () => {
    beforeEach(clearAll);

    it('معرّف الربط ثابت ومتوقع', () => {
        const id = buildStableBridgeId('lawsuit', 'file-9', 'appt_x');
        expect(id).toBe('hami_bridge_lawsuit_file-9_appt_x');
        expect(id).toBe(buildStableBridgeId('lawsuit', 'file-9', 'appt_x'));
    });

    it('قواعد الاستبعاد: دعوى محذوفة/مؤرشفة/مرحلة مؤرشفة', () => {
        expect(shouldExcludeLawsuitFromCalendar({ status: 'deleted' })).toBe(true);
        expect(shouldExcludeLawsuitFromCalendar({ status: 'archived' })).toBe(true);
        expect(shouldExcludeLawsuitFromCalendar({ status: 'archived_stage' })).toBe(true);
        expect(shouldExcludeLawsuitFromCalendar({ status: 'active' })).toBe(false);
    });

    it('قواعد الاستبعاد: تنفيذ في السلة أو غير نشط', () => {
        expect(
            shouldExcludeExecutionFromCalendar({
                executionTrashDeletedAt: new Date().toISOString(),
            }),
        ).toBe(true);
        expect(shouldExcludeExecutionFromCalendar({ status: 'archived' })).toBe(true);
        expect(shouldExcludeExecutionFromCalendar({ status: 'active' })).toBe(false);
    });

    it('سيناريو كامل: نشط → يظهر، أرشفة+محذوف → يختفي، يدوي يبقى', async () => {
        const activeFile = {
            id: 'contract-file',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'hearing-1',
                            type: 'appointment',
                            date: '2028-03-10',
                            title: 'جلسة عقدية',
                        },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([activeFile]);
        await reconcileAllDossierDates(USER);
        await wait();

        const bridgeId = buildStableBridgeId('lawsuit', 'contract-file', 'hearing-1');
        let events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === bridgeId)).toBe(true);

        const manualId = 'manual-contract-note';
        const now = new Date().toISOString();
        await CalendarDB.saveEvent({
            id: manualId,
            userId: USER,
            title: 'استشارة يدوية',
            date: '2028-03-20',
            type: 'consultation',
            sourceModule: 'manual',
            createdAt: now,
            updatedAt: now,
        });

        saveLawsuitFilesRaw([{ ...activeFile, status: 'archived' }]);
        await purgeExcludedDossierBridgedEvents(USER);
        events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === bridgeId)).toBe(false);
        expect(events.some((e) => e.id === manualId)).toBe(true);

        saveLawsuitFilesRaw([{ ...activeFile, status: 'deleted', deletedAt: Date.now() }]);
        await cleanupCalendarForUser(USER);
        events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === bridgeId)).toBe(false);
        expect(events.some((e) => e.id === manualId)).toBe(true);
        expect(events.filter(isBridgedCalendarEvent).every((e) => e.sourceEntityId !== 'contract-file')).toBe(
            true,
        );
    });

    it('مزامنة شاملة تستثني مهام النظام السريعة فقط', async () => {
        saveLawsuitFilesRaw([
            {
                id: 'tasks-only',
                status: 'active',
                stages: [
                    {
                        id: 's1',
                        timeline: [],
                        tasks: [
                            {
                                id: 'task_fast_123',
                                title: 'مهمة نظام',
                                dueDate: '2028-04-01',
                                isCompleted: false,
                            },
                        ],
                    },
                ],
            },
        ]);
        const stats = await reconcileAllDossierDates(USER);
        await wait();
        expect(stats.lawsuitTasks).toBe(0);

        const taskBridge = buildStableBridgeId('lawsuit', 'tasks-only', 'task_task_fast_123');
        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === taskBridge)).toBe(false);
    });

    it('🛡️ WHITELIST: مهام الدعاوى (lawsuit tasks) لا تُرفع للتقويم — فقط appointments', async () => {
        saveLawsuitFilesRaw([
            {
                id: 'user-tasks',
                status: 'active',
                stages: [
                    {
                        id: 's1',
                        timeline: [],
                        tasks: [
                            {
                                id: 'user-task-1',
                                title: 'مهمة محامٍ',
                                dueDate: '2028-04-15',
                                isCompleted: false,
                            },
                        ],
                    },
                ],
            },
        ]);
        const stats = await reconcileAllDossierDates(USER);
        await wait();
        expect(stats.lawsuitTasks).toBe(0);
        const taskBridge = buildStableBridgeId('lawsuit', 'user-tasks', 'task_user-task-1');
        const events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === taskBridge)).toBe(false);
    });

    it('إضافة جلسة من الإضبارة ترفع حدثاً مربوطاً واحداً', async () => {
        syncLawsuitTimelineAppointment({
            userId: USER,
            fileId: 'live-sync',
            event: { id: 'appt-live', date: '2028-05-01', title: 'جلسة مباشرة' },
        });
        await wait();

        const events = await CalendarDB.getEvents(USER);
        const bridged = events.filter(isBridgedCalendarEvent);
        expect(bridged.length).toBe(1);
        expect(bridged[0]?.sourceModule).toBe('lawsuit');
        expect(bridged[0]?.sourceEntityId).toBe('live-sync');
        expect(bridged[0]?.sourceEventId).toBe('appt-live');
    });
});
