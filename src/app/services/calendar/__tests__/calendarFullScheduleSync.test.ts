import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_STATS } from '@/app/services/calendar/dossierSync/shared';
import { syncOneLawsuitFile } from '@/app/services/calendar/dossierSync/lawsuitSync';
import { syncOneExecutionFile } from '@/app/services/calendar/dossierSync/executionSync';
import { syncTransactionsCalendarSnapshot } from '@/app/services/calendar/dossierSync/auxiliarySync';
import { syncGlobalNotesToCalendar } from '@/app/services/calendar/dossierSync/incrementalSync';
import { CALENDAR_SYNC_RULES } from '@/app/services/calendar/dossierSync/orchestrator';
import { LAWSUIT_CAL_APPT } from '@/app/services/lawsuitTimelineCalendarMirror';

const syncLawsuitAppointment = vi.fn();
const syncLawsuitTask = vi.fn();
const syncExecutionAppointment = vi.fn();
const syncExecutionTask = vi.fn();
const syncTransactionAppointment = vi.fn();
const syncNoteReminder = vi.fn();
const remove = vi.fn();

vi.mock('@/app/services/calendar/bridge', async () => {
    const actual = await vi.importActual<typeof import('@/app/services/calendar/bridge')>(
        '@/app/services/calendar/bridge',
    );
    return {
        ...actual,
        CalendarBridge: {
            ...actual.CalendarBridge,
            syncLawsuitAppointment: (...args: unknown[]) => syncLawsuitAppointment(...args),
            syncLawsuitTask: (...args: unknown[]) => syncLawsuitTask(...args),
            syncExecutionAppointment: (...args: unknown[]) => syncExecutionAppointment(...args),
            syncExecutionTask: (...args: unknown[]) => syncExecutionTask(...args),
            syncTransactionAppointment: (...args: unknown[]) => syncTransactionAppointment(...args),
            syncNoteReminder: (...args: unknown[]) => syncNoteReminder(...args),
            remove: (...args: unknown[]) => remove(...args),
        },
    };
});

describe('CALENDAR_SYNC_RULES completeness', () => {
    it('يفصل المسار الحيّ عن مسارات reconcile المعطّلة', () => {
        expect(CALENDAR_SYNC_RULES.active.threading).toBeDefined();
        expect(CALENDAR_SYNC_RULES.active.lawsuit?.some((r) => r.includes('appointment'))).toBe(true);
        expect(CALENDAR_SYNC_RULES.active.lawsuit?.some((r) => r.includes('legalTimers'))).toBe(true);
        expect(CALENDAR_SYNC_RULES.active.execution?.some((r) => r.includes('appointment'))).toBe(
            true,
        );
        expect(CALENDAR_SYNC_RULES.active.execution?.some((r) => r.includes('visitationSchedule'))).toBe(
            true,
        );
        expect((CALENDAR_SYNC_RULES.disabled as { lawsuitLegacy?: unknown }).lawsuitLegacy).toBeDefined();
        expect((CALENDAR_SYNC_RULES.disabled as { executionTasks?: unknown }).executionTasks).toBeDefined();
        expect((CALENDAR_SYNC_RULES.disabled as { note?: unknown }).note).toBeDefined();
        expect(
            String((CALENDAR_SYNC_RULES.disabled as { threadingFinance: readonly string[] }).threadingFinance),
        ).toContain('مهجور');
    });
});

describe('syncOneLawsuitFile — مهام ومُهل', () => {
    beforeEach(() => {
        syncLawsuitAppointment.mockClear();
        syncLawsuitTask.mockClear();
        remove.mockClear();
    });

    it('يرفع مهمة استحقاق ومهلة طعن مخزّنة', () => {
        const stats = EMPTY_STATS();
        syncOneLawsuitFile(
            {
                id: 10,
                caseNo: '2026/1',
                stages: [
                    {
                        id: 'st1',
                        stageName: 'بداءة',
                        appealDeadline: '2026-07-30',
                        decisionDate: '2026-07-01',
                        timeline: [],
                        tasks: [{ id: 'tk1', title: 'لائحة', dueDate: '2026-07-22', isCompleted: false }],
                    },
                ],
            },
            'lawyer-1',
            stats,
            { includeTasks: true },
        );

        expect(syncLawsuitTask).toHaveBeenCalledWith(
            expect.objectContaining({ taskId: 'tk1', dueDate: '2026-07-22' }),
        );
        expect(syncLawsuitAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEventId: LAWSUIT_CAL_APPT.appealDeadline('st1'),
                date: '2026-07-30',
            }),
        );
        expect(stats.lawsuitTasks).toBe(1);
        expect(stats.lawsuitDeadlines).toBeGreaterThanOrEqual(1);
    });

    it('يتجاهل المهام ephemeral', () => {
        const stats = EMPTY_STATS();
        syncOneLawsuitFile(
            {
                id: 11,
                stages: [
                    {
                        id: 'st1',
                        timeline: [],
                        tasks: [
                            {
                                id: 'task_fast_1',
                                title: 'نظام',
                                dueDate: '2026-07-22',
                                isCompleted: false,
                            },
                        ],
                    },
                ],
            },
            'lawyer-1',
            stats,
            { includeTasks: true },
        );
        expect(syncLawsuitTask).not.toHaveBeenCalled();
    });

    it('whitelistOnly: مواعيد timeline + مهلة قانونية بلا مهام ولا nextDate', () => {
        const stats = EMPTY_STATS();
        syncOneLawsuitFile(
            {
                id: 12,
                caseNo: '2026/2',
                nextDate: '2026-08-01',
                stages: [
                    {
                        id: 'st1',
                        stageName: 'بداءة',
                        appealDeadline: '2026-07-30',
                        timeline: [
                            {
                                id: 'appt1',
                                type: 'appointment',
                                date: '2026-07-15',
                                title: 'جلسة',
                            },
                        ],
                        tasks: [{ id: 'tk1', title: 'لائحة', dueDate: '2026-07-22', isCompleted: false }],
                    },
                ],
            },
            'lawyer-1',
            stats,
            { whitelistOnly: true, includeTasks: false },
        );

        expect(syncLawsuitAppointment).toHaveBeenCalledWith(
            expect.objectContaining({ timelineEventId: 'appt1' }),
        );
        expect(syncLawsuitTask).not.toHaveBeenCalled();
        expect(
            syncLawsuitAppointment.mock.calls.some(
                (call) => call[0]?.timelineEventId === LAWSUIT_CAL_APPT.appealDeadline('st1'),
            ),
        ).toBe(true);
        expect(
            syncLawsuitAppointment.mock.calls.some(
                (call) => call[0]?.timelineEventId === 'file_next_date',
            ),
        ).toBe(false);
        expect(stats.lawsuitTasks).toBe(0);
        expect(stats.lawsuitDeadlines).toBeGreaterThanOrEqual(1);
    });
});

describe('syncOneExecutionFile — مهام', () => {
    beforeEach(() => {
        syncExecutionTask.mockClear();
        syncExecutionAppointment.mockClear();
    });

    it('يرفع مهمة تنفيذ بتاريخ استحقاق', () => {
        const stats = EMPTY_STATS();
        syncOneExecutionFile(
            {
                id: 'ex-1',
                timelineEvents: [],
                caseTasksPending: [{ id: 'et1', title: 'حجز', dueDate: '2026-07-28' }],
            },
            'lawyer-1',
            stats,
            { includeTasks: true },
        );
        expect(syncExecutionTask).toHaveBeenCalledWith(
            expect.objectContaining({ taskId: 'et1', dueDate: '2026-07-28' }),
        );
        expect(stats.executionTasks).toBe(1);
    });

    it('يرفع موعد المشاهدة القادم فقط حتى في المسار الحيّ', () => {
        const stats = EMPTY_STATS();
        syncOneExecutionFile(
            {
                id: 'ex-visit',
                timelineEvents: [],
                visitationSchedule: {
                    config: { startTime: '16:00', location: 'بيت الطفل' },
                    sessions: [
                        {
                            id: 's-past',
                            date: '2020-01-01',
                            status: 'completed',
                            documentedAt: '2020-01-01T00:00:00.000Z',
                        },
                        { id: 's-next', date: '2099-06-15', status: 'scheduled' },
                        { id: 's-later', date: '2099-07-01', status: 'scheduled' },
                    ],
                },
            },
            'lawyer-1',
            stats,
            { whitelistOnly: true, includeTasks: false },
        );
        expect(syncExecutionTask).not.toHaveBeenCalled();
        expect(syncExecutionAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEventId: 'visit_next',
                date: '2099-06-15',
                purpose: 'موعد مشاهدة',
            }),
        );
        expect(stats.executionAppointments).toBe(1);
    });
});

describe('syncTransactionsCalendarSnapshot', () => {
    beforeEach(() => {
        syncTransactionAppointment.mockClear();
        remove.mockClear();
    });

    it('يرفع خطوة معاملة بموعد صريح', () => {
        const stats = EMPTY_STATS();
        syncTransactionsCalendarSnapshot(
            'lawyer-1',
            [
                {
                    id: 'tx1',
                    userId: 'lawyer-1',
                    clientName: 'موكل',
                    steps: [
                        {
                            id: 'step1',
                            label: 'تقديم',
                            appointmentDate: '2026-07-21',
                            appointmentTime: '10:00',
                        },
                    ],
                },
            ],
            stats,
        );
        expect(syncTransactionAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
                transactionId: 'tx1',
                stepId: 'step1',
                date: '2026-07-21',
            }),
        );
        expect(stats.transactionSteps).toBe(1);
    });
});

describe('syncGlobalNotesToCalendar', () => {
    beforeEach(() => {
        syncNoteReminder.mockClear();
    });

    it('يرفع ملاحظة بتاريخ تذكير', () => {
        const stats = EMPTY_STATS();
        syncGlobalNotesToCalendar(
            [{ id: 'n1', title: 'متابعة', apptDate: '2026-07-24' }],
            'lawyer-1',
            stats,
        );
        expect(syncNoteReminder).toHaveBeenCalledWith(
            expect.objectContaining({ noteId: 'n1', date: '2026-07-24' }),
        );
        expect(stats.globalNotes).toBe(1);
    });
});
