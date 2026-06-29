import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { SecretaryOrchestrator, parseDate, normalizeDigits } from '../SecretaryOrchestrator';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { UrgentActionsDB } from '../urgent-actions-db';
import { filterVisibleAlerts, dismissAlertId, getDismissedAlertIds } from '../appAlertDismiss';
import { combineHeaderUnreadCount } from '../alertMappers';
import { buildStableBridgeId } from '../calendarBridge';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

function mockBridgedCalendarEvent(p: {
    module: 'lawsuit' | 'execution';
    entityId: string;
    eventId: string;
    date: string;
    title?: string;
    caseNo?: string;
    type?: CalendarEvent['type'];
}): CalendarEvent {
    return {
        id: buildStableBridgeId(p.module, p.entityId, p.eventId),
        userId: 'lawyer-1',
        title: p.title ?? 'جلسة',
        date: p.date,
        type: p.type ?? (p.module === 'execution' ? 'execution' : 'hearing'),
        sourceModule: p.module,
        sourceEntityId: p.entityId,
        sourceEventId: p.eventId,
        caseId: p.entityId,
        caseNo: p.caseNo,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

vi.mock('@/app/services/ClientRequestService', () => ({
    ClientRequestService: {
        getLawyerRequests: vi.fn().mockResolvedValue([]),
    },
}));

const calendarTestStore: CalendarEvent[] = [];

vi.mock('@/app/services/lawyer-cloud', () => ({
    getCommunityPosts: vi.fn().mockResolvedValue([]),
    CalendarDB: {
        getEvents: vi.fn(async (userId: string) =>
            calendarTestStore.filter((e) => e.userId === userId),
        ),
        getAllStoredEvents: vi.fn(async () => [...calendarTestStore]),
        saveEvent: vi.fn(async (event: CalendarEvent) => {
            const idx = calendarTestStore.findIndex((e) => e.id === event.id);
            if (idx >= 0) calendarTestStore[idx] = event;
            else calendarTestStore.push(event);
        }),
        saveEventsBatch: vi.fn(async (events: CalendarEvent[]) => {
            for (const event of events) {
                const idx = calendarTestStore.findIndex((e) => e.id === event.id);
                if (idx >= 0) calendarTestStore[idx] = event;
                else calendarTestStore.push(event);
            }
        }),
        deleteEvent: vi.fn(async (eventId: string) => {
            const idx = calendarTestStore.findIndex((e) => e.id === eventId);
            if (idx >= 0) calendarTestStore.splice(idx, 1);
        }),
        updateEvent: vi.fn(async (event: CalendarEvent) => {
            const idx = calendarTestStore.findIndex((e) => e.id === event.id);
            if (idx >= 0) calendarTestStore[idx] = event;
            else calendarTestStore.push(event);
        }),
    },
    TransactionsThreadingDB: {
        getState: vi.fn().mockResolvedValue({
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
        }),
    },
}));

vi.mock('@/app/infrastructure/NotificationRepository', () => ({
    NotificationRepository: {
        fetchNotifications: vi.fn().mockResolvedValue([]),
    },
}));

describe('Unified alerts orchestrator', () => {
    beforeEach(() => {
        saveLawsuitFilesRaw([]);
        saveExecutionFilesRaw([]);
        calendarTestStore.length = 0;
        localStorage.clear();
    });

    it('يرفع تنبيهاً لجلسة دعوى من stages', async () => {
        const apptDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const file = {
            id: 10,
            type: 'lawsuit',
            status: 'active',
            caseNo: '2026/1',
            court: 'بغداد',
            parties: [{ id: 1, name: 'أحمد الموكل', isClient: true, role: 'مدعي' }],
            history: [],
            notes: [],
            images: [],
            date: new Date().toISOString(),
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'h1',
                            type: 'appointment',
                            date: apptDate,
                            title: 'جلسة',
                        },
                    ],
                },
            ],
        } as unknown as FileData;

        const { ensureCalendarPopulatedFromLiveDossiers } = await import('@/app/services/calendarDossierSync');
        saveLawsuitFilesRaw([file]);
        await ensureCalendarPopulatedFromLiveDossiers({
            lawyerId: 'lawyer-1',
            lawsuitFiles: [file],
            executionFiles: [],
        });

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [file],
            executionFiles: [],
            notes: [],
        });

        const hearing = alerts.find(
            (a) => a.type === 'HEARING' && a.target === 'lawsuit' && a.entityId === '10',
        );
        expect(hearing).toBeDefined();
        expect(hearing?.title).toContain('أحمد الموكل');
        expect(hearing?.title).toContain('2026/1');
        expect(hearing?.suggestedAction).toContain('تحضير دفوع الجلسة');
    });

    it('لا يرفع تنبيهاً لدعوى مؤرشفة', async () => {
        const apptDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const file = {
            id: 11,
            type: 'lawsuit',
            status: 'archived',
            caseNo: '2026/2',
            court: 'بغداد',
            parties: [{ id: 1, name: 'موكل', isClient: true, role: 'مدعي' }],
            history: [],
            notes: [],
            images: [],
            date: new Date().toISOString(),
        } as unknown as FileData;

        const { CalendarDB } = await import('@/app/services/lawyer-cloud');
        vi.mocked(CalendarDB.getEvents).mockResolvedValueOnce([
            mockBridgedCalendarEvent({
                module: 'lawsuit',
                entityId: '11',
                eventId: 'h1',
                date: apptDate,
                caseNo: '2026/2',
            }),
        ]);

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [file],
            executionFiles: [],
            notes: [],
        });

        expect(alerts.some((a) => a.entityId === '11')).toBe(false);
    });

    it('يرفع تنبيهاً لتنفيذ ويستبعد السلة', async () => {
        const apptDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const active = {
            id: 'ex-1',
            status: 'active',
            fileNumber: '1540',
            fileYear: '2026',
            directorate: 'مديرية تنفيذ الكرخ',
            debtors: [{ id: 'd1', name: 'المدين علي' }],
            timelineEvents: [
                {
                    id: 'a1',
                    type: 'appointment',
                    date: apptDate,
                    title: 'موعد',
                },
            ],
        };
        const trashed = {
            ...active,
            id: 'ex-2',
            executionTrashDeletedAt: new Date().toISOString(),
        };

        const { ensureCalendarPopulatedFromLiveDossiers } = await import('@/app/services/calendarDossierSync');
        saveExecutionFilesRaw([active, trashed]);
        await ensureCalendarPopulatedFromLiveDossiers({
            lawyerId: 'lawyer-1',
            lawsuitFiles: [],
            executionFiles: [active, trashed],
        });

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [active, trashed],
            notes: [],
        });

        expect(alerts.some((a) => a.target === 'execution' && a.entityId === 'ex-1')).toBe(true);
        expect(alerts.some((a) => a.entityId === 'ex-2')).toBe(false);
    });

    it('🛡️ WHITELIST: الطلبات المستعجلة (UrgentActionsDB) لا تُولّد تنبيهات في البطاقة العامة', async () => {
        // المستخدم لم يطلب ربط urgent — مستبعدة من الـ whitelist
        const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        await UrgentActionsDB.saveState('lawyer-1', [
            {
                id: 'urg-1',
                type: 'urgent_action',
                actionType: 'حجز احتياطي',
                applicantName: 'موكل',
                requestNumber: '2026/99',
                court: 'محكمة بداءة الكرخ',
                deadlineDate: deadline,
                phase: 'notification_pending',
                status: 'warning',
                createdAt: new Date(),
            },
        ]);

        const { ensureCalendarPopulatedFromLiveDossiers } = await import('@/app/services/calendarDossierSync');
        await ensureCalendarPopulatedFromLiveDossiers({
            lawyerId: 'lawyer-1',
            lawsuitFiles: [],
            executionFiles: [],
        });

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            notes: [],
        });

        const urgent = alerts.find((a) => a.target === 'urgent' && a.entityId === 'urg-1');
        expect(urgent).toBeUndefined();
    });

    it('يستبعد موعد تنفيذ منقضٍ (مستقبل فقط)', async () => {
        const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const exFile = {
            id: 'ex-old',
            status: 'active',
            fileNumber: '100',
            debtors: [{ id: 'd1', name: 'مدين' }],
            timelineEvents: [{ id: 'o1', type: 'appointment', date: oldDate, title: 'قديم' }],
        };
        const { ensureCalendarPopulatedFromLiveDossiers } = await import('@/app/services/calendarDossierSync');
        await ensureCalendarPopulatedFromLiveDossiers({
            lawyerId: 'lawyer-1',
            lawsuitFiles: [],
            executionFiles: [exFile],
        });
        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [exFile],
            notes: [],
        });
        expect(alerts.some((a) => a.entityId === 'ex-old')).toBe(false);
    });

    it('parseDate يدعم الأرقام العربية', () => {
        expect(parseDate('٢٠٢٦-٠٥-١٦')).not.toBeNull();
        expect(normalizeDigits('١٢')).toBe('12');
    });

    it('يرفع تنبيهاً لموعد تقويم يدوي غير مربوط بإضبارة', async () => {
        const { CalendarDB } = await import('@/app/services/lawyer-cloud');
        await CalendarDB.saveEvent({
            id: 'cal-manual-1',
            userId: 'lawyer-1',
            title: 'استشارة',
            clientName: 'سارة الموكل',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            time: '10:00',
            type: 'consultation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceModule: 'manual',
        });

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            notes: [],
        });

        expect(alerts.some((a) => a.id === 'calendar:cal-manual-1' && a.target === 'schedule')).toBe(true);
    });

    it('يرفع تنبيهاً لمهمة ميدانية عبر التقويم بعد المزامنة', async () => {
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const fieldTask = {
            id: 'ft-1',
            rawText: 'تبليغ',
            title: 'تبليغ موكل',
            location: 'محكمة',
            parsedDate: tomorrow,
            reminderAt: null,
            isFatalDeadline: false,
            linkedCaseId: null,
            status: 'pending' as const,
            completedAt: null,
            pinnedToFieldCurtain: true,
            fieldCurtainPinnedAt: null,
            subTasks: [],
            documentRequirements: [],
            expenses: [],
            voiceRef: null,
            voiceTranscript: null,
            voiceDurationSec: null,
        };
        const { syncFieldTasksToCalendar } = await import('@/app/services/calendarDossierSync');
        const { buildStableBridgeId, flushPendingCalendarSyncs } = await import(
            '@/app/services/calendarBridge'
        );
        syncFieldTasksToCalendar([fieldTask], 'lawyer-1', {
            lawsuitAppointments: 0,
            lawsuitTasks: 0,
            lawsuitDeadlines: 0,
            executionAppointments: 0,
            executionTasks: 0,
            urgentHearings: 0,
            transactionSteps: 0,
            criminalTimeline: 0,
            criminalTrials: 0,
            threadingTasks: 0,
            globalNotes: 0,
            fieldTasks: 0,
            lawsuitLegacy: 0,
            prunedOrphans: 0,
            purgedInactive: 0,
        });
        await flushPendingCalendarSyncs();

        const bridgeId = buildStableBridgeId('task', 'ft-1', 'due');
        expect(calendarTestStore.some((e) => e.id === bridgeId)).toBe(true);
        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            notes: [],
            fieldTasks: [fieldTask],
        });

        const injected = alerts.find((a) => a.id === 'field-task:ft-1');
        expect(injected).toBeDefined();
        expect(injected?.fieldTaskInjected).toBe(true);
        expect(injected?.suggestedAction).toContain('إنجاز المهمة الميدانية');
        expect(alerts.some((a) => a.id === `calendar:${bridgeId}`)).toBe(false);
    });
});

describe('appAlertDismiss', () => {
    beforeEach(() => localStorage.clear());

    it('يخفي التنبيهات المُهمَلة من العرض والشارة', async () => {
        const alerts = [
            {
                id: 'a1',
                type: 'HEARING' as const,
                title: 'جلسة',
                summary: 's',
                aiDeepDive: 'd',
                target: 'lawsuit' as const,
                priority: 1,
            },
            {
                id: 'a2',
                type: 'TASK' as const,
                title: 'مهمة',
                summary: 's',
                aiDeepDive: 'd',
                target: 'lawsuit' as const,
                priority: 4,
            },
        ];
        dismissAlertId('a1');
        expect(filterVisibleAlerts(alerts).map((a) => a.id)).toEqual(['a2']);
        expect(combineHeaderUnreadCount(0, alerts, getDismissedAlertIds())).toBe(0);
    });
});
