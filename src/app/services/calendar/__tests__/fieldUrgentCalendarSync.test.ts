import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_STATS } from '@/app/services/calendar/dossierSync/shared';
import { syncOneUrgentCase } from '@/app/services/calendar/dossierSync/urgentSync';
import { syncFieldTasksToCalendar } from '@/app/services/calendar/dossierSync/incrementalSync';
import { CALENDAR_SYNC_RULES } from '@/app/services/calendar/dossierSync/orchestrator';
import type { LegalTask } from '@/app/types/TaskEngine';

const syncUrgentHearing = vi.fn();
const remove = vi.fn();
const syncFieldTaskDue = vi.fn();

vi.mock('@/app/services/calendar/bridge', async () => {
    const actual = await vi.importActual<typeof import('@/app/services/calendar/bridge')>(
        '@/app/services/calendar/bridge',
    );
    return {
        ...actual,
        CalendarBridge: {
            ...actual.CalendarBridge,
            syncUrgentHearing: (...args: unknown[]) => syncUrgentHearing(...args),
            syncFieldTaskDue: (...args: unknown[]) => syncFieldTaskDue(...args),
            remove: (...args: unknown[]) => remove(...args),
        },
    };
});

describe('CALENDAR_SYNC_RULES', () => {
    it('يحصر المسار الحيّ في نقاط الدخول المفعّلة ويعطّل legacy', () => {
        expect(CALENDAR_SYNC_RULES.active.lawsuit).toBeDefined();
        expect(CALENDAR_SYNC_RULES.active.execution).toBeDefined();
        expect(CALENDAR_SYNC_RULES.active.criminal).toBeDefined();
        expect(CALENDAR_SYNC_RULES.active.threading).toBeDefined();
        expect((CALENDAR_SYNC_RULES.disabled as { urgent?: unknown }).urgent).toBeDefined();
        expect((CALENDAR_SYNC_RULES.disabled as { task?: unknown }).task).toBeDefined();
        expect((CALENDAR_SYNC_RULES.disabled as { note?: unknown }).note).toBeDefined();
    });
});

describe('syncOneUrgentCase', () => {
    beforeEach(() => {
        syncUrgentHearing.mockClear();
        remove.mockClear();
    });

    it('يرفع جلسة ومهلة صريحتين بمعرّفات prune', () => {
        const stats = EMPTY_STATS();
        syncOneUrgentCase(
            {
                id: 'u1',
                caseNumber: '123',
                sessionDate: '2026-07-21',
                deadlineDate: '2026-07-25',
                hearings: [
                    {
                        id: 'h1',
                        stage: 'pre_decision',
                        sessionDate: '2026-07-22',
                        nextSessionDate: '2026-07-29',
                        notes: 'تأجيل',
                    },
                ],
            },
            'lawyer-1',
            stats,
        );

        expect(stats.urgentHearings).toBeGreaterThanOrEqual(3);
        expect(syncUrgentHearing).toHaveBeenCalledWith(
            expect.objectContaining({
                caseId: 'u1',
                hearingId: 'case_session_date',
                sessionDate: '2026-07-21',
            }),
        );
        expect(syncUrgentHearing).toHaveBeenCalledWith(
            expect.objectContaining({
                hearingId: 'case_deadline_date',
                sessionDate: '2026-07-25',
            }),
        );
        expect(syncUrgentHearing).toHaveBeenCalledWith(
            expect.objectContaining({
                hearingId: 'h1',
                sessionDate: '2026-07-22',
                nextSessionDate: '2026-07-29',
            }),
        );
    });

    it('يحذف المعرّفات عند غياب التاريخ', () => {
        const stats = EMPTY_STATS();
        syncOneUrgentCase({ id: 'u2', hearings: [] }, 'lawyer-1', stats);
        expect(remove).toHaveBeenCalledWith('urgent', 'u2', 'case_session_date', 'lawyer-1');
        expect(remove).toHaveBeenCalledWith('urgent', 'u2', 'case_deadline_date', 'lawyer-1');
    });
});

describe('syncFieldTasksToCalendar', () => {
    beforeEach(() => {
        syncFieldTaskDue.mockClear();
        remove.mockClear();
    });

    it('يرفع مهمة بتاريخ صريح ويزيل غير المؤهلة', () => {
        const stats = EMPTY_STATS();
        const pending: LegalTask = {
            id: 'ft-1',
            rawText: 'تبليغ',
            title: 'تبليغ',
            location: 'كرخ',
            parsedDate: new Date('2026-07-21T12:00:00'),
            reminderAt: null,
            isFatalDeadline: false,
            linkedCaseId: null,
            status: 'pending',
            completedAt: null,
            pinnedToFieldCurtain: false,
            fieldCurtainPinnedAt: null,
            subTasks: [],
            documentRequirements: [],
            expenses: [],
            voiceRef: null,
            voiceTranscript: null,
            voiceDurationSec: null,
        };
        const done: LegalTask = { ...pending, id: 'ft-2', status: 'completed' };

        syncFieldTasksToCalendar([pending, done], 'lawyer-1', stats);

        expect(stats.fieldTasks).toBe(1);
        expect(syncFieldTaskDue).toHaveBeenCalledWith(
            expect.objectContaining({
                taskId: 'ft-1',
                location: 'كرخ',
            }),
        );
        expect(remove).toHaveBeenCalledWith('task', 'ft-2', 'due', 'lawyer-1');
    });
});
