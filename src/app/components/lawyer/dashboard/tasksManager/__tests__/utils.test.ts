import { describe, expect, it, beforeEach } from 'vitest';
import {
    getSaturdayOfWeekContaining,
    isDateInWorkWeek,
    isDeferredSnoozedTask,
    isWeeklyAgendaDayVisible,
    isWeeklyPastDayCompact,
    finalizePastWeekTasks,
    promoteDueSnoozedTasks,
    partitionAgendaPendingTasks,
    buildPostponeTaskPatch,
} from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { WORK_WEEK, WORK_WEEK_LAST_OFFSET } from '@/app/components/lawyer/dashboard/tasksManager/constants';
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, startOfLocalDay } from '@/app/utils/nlpParser';
import {
    blockTasksOverlayEscape,
    isTasksOverlayEscapeBlocked,
    resetTasksOverlayEscapeForTests,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';

function localDate(y: number, m: number, d: number): Date {
    return new Date(y, m - 1, d, 12, 0, 0, 0);
}

describe('tasksManager/utils — work week', () => {
    it('WORK_WEEK يغطي سبت–جمعة (7 أيام)', () => {
        expect(WORK_WEEK).toHaveLength(7);
        expect(WORK_WEEK[0]?.key).toBe('sat');
        expect(WORK_WEEK[WORK_WEEK_LAST_OFFSET]?.key).toBe('fri');
    });

    it('getSaturdayOfWeekContaining يعيد السبت لأسبوع يحتوي الأربعاء', () => {
        const wed = localDate(2026, 7, 1);
        const sat = getSaturdayOfWeekContaining(wed);
        expect(sat.getDay()).toBe(6);
        expect(sat.getTime()).toBeLessThanOrEqual(wed.getTime());
    });

    it('isDateInWorkWeek يشمل الجمعة ضمن الأسبوع', () => {
        const ref = localDate(2026, 6, 28);
        const weekStart = getSaturdayOfWeekContaining(ref);
        const friday = addDays(weekStart, WORK_WEEK_LAST_OFFSET);
        expect(friday.getDay()).toBe(5);
        expect(isDateInWorkWeek(friday, weekStart)).toBe(true);
    });

    it('isDateInWorkWeek يستبعد اليوم قبل السبت', () => {
        const ref = localDate(2026, 6, 28);
        const weekStart = getSaturdayOfWeekContaining(ref);
        const before = addDays(weekStart, -1);
        expect(isDateInWorkWeek(before, weekStart)).toBe(false);
    });
});

describe('weekly agenda visibility', () => {
    const now = localDate(2026, 7, 1);

    it('يبقي كل أيام الأسبوع ظاهرة حتى الفارغة والمنتهية', () => {
        const past = addDays(now, -1);
        expect(isWeeklyAgendaDayVisible(past, 0, now, null, 'tue')).toBe(true);
        expect(isWeeklyAgendaDayVisible(past, 2, now, null, 'tue')).toBe(true);
        expect(isWeeklyPastDayCompact(past, 2, now)).toBe(true);
    });

    it('يبقي اليوم الحالي والمستقبل حتى لو فارغاً', () => {
        expect(isWeeklyAgendaDayVisible(now, 0, now, null, 'wed')).toBe(true);
        const future = addDays(now, 1);
        expect(isWeeklyAgendaDayVisible(future, 0, now, null, 'thu')).toBe(true);
        expect(isWeeklyPastDayCompact(future, 0, now)).toBe(false);
    });
});

function archivedTask(parsedDate: Date): LegalTask {
    return {
        id: 't1',
        rawText: 'مهمة',
        title: 'مهمة',
        location: null,
        parsedDate,
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
}

describe('buildPostponeTaskPatch', () => {
    it('داخل الأسبوع الحالي: parsedDate وبدون reminderAt', () => {
        const now = localDate(2026, 8, 3); // Monday
        const weekStart = getSaturdayOfWeekContaining(now);
        const target = addDays(weekStart, 3);
        const patch = buildPostponeTaskPatch(target, now);
        expect(patch.parsedDate?.getTime()).toBe(startOfLocalDay(target).getTime());
        expect(patch.reminderAt).toBeNull();
    });

    it('خارج الأسبوع الحالي: reminderAt وبدون parsedDate', () => {
        const now = localDate(2026, 8, 3);
        const weekStart = getSaturdayOfWeekContaining(now);
        const target = addDays(weekStart, 10);
        const patch = buildPostponeTaskPatch(target, now);
        expect(patch.parsedDate).toBeNull();
        expect(patch.reminderAt?.getTime()).toBe(startOfLocalDay(target).getTime());
    });
});

describe('finalizePastWeekTasks', () => {
    it('يضبط completedAt عند نقل أسبوع سابق للأرشيف', () => {
        const now = localDate(2026, 7, 5);
        const lastWeek = localDate(2026, 6, 28);
        const [next] = finalizePastWeekTasks([archivedTask(lastWeek)], now);
        expect(next?.status).toBe('completed');
        expect(next?.completedAt).not.toBeNull();
    });
});

describe('snoozed backlog tasks', () => {
    function snoozedTask(reminderAt: Date): LegalTask {
        return {
            id: 's1',
            rawText: 'مؤجلة',
            title: 'مؤجلة',
            location: null,
            parsedDate: null,
            reminderAt,
            isFatalDeadline: false,
            linkedCaseId: null,
            status: 'pending',
            completedAt: null,
            pinnedToFieldCurtain: false,
            subTasks: [],
            documentRequirements: [],
            expenses: [],
        };
    }

    it('isDeferredSnoozedTask يميز المؤجلة في أسبوع لاحق', () => {
        const now = localDate(2026, 7, 1);
        expect(isDeferredSnoozedTask(snoozedTask(localDate(2026, 7, 10)), now)).toBe(true);
        expect(isDeferredSnoozedTask(snoozedTask(localDate(2026, 7, 1)), now)).toBe(false);
    });

    it('promoteDueSnoozedTasks ينقل المهمة إلى الأجندة عند بداية أسبوع الموعد', () => {
        const now = localDate(2026, 7, 4);
        const dueDay = localDate(2026, 7, 10);
        const [promoted] = promoteDueSnoozedTasks([snoozedTask(dueDay)], now);
        expect(promoted!.parsedDate?.getTime()).toBe(startOfLocalDay(dueDay).getTime());
        expect(promoted!.reminderAt).toBeNull();
    });
});

describe('tasksEscapeCoordinator', () => {
    beforeEach(() => {
        resetTasksOverlayEscapeForTests();
    });

    it('يمنع Escape عند وجود blocker', () => {
        expect(isTasksOverlayEscapeBlocked()).toBe(false);
        blockTasksOverlayEscape('modal');
        expect(isTasksOverlayEscapeBlocked()).toBe(true);
        unblockTasksOverlayEscape('modal');
        expect(isTasksOverlayEscapeBlocked()).toBe(false);
    });

    it('resetTasksOverlayEscapeForTests يفرغ كل blockers', () => {
        blockTasksOverlayEscape('a');
        blockTasksOverlayEscape('b');
        resetTasksOverlayEscapeForTests();
        expect(isTasksOverlayEscapeBlocked()).toBe(false);
    });
});

describe('partitionAgendaPendingTasks', () => {
    function baseTask(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
        return {
            id: partial.id,
            rawText: partial.title,
            title: partial.title,
            location: null,
            parsedDate: null,
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
            ...partial,
        };
    }

    it('يمرّ مرة واحدة: أسبوع + بعيدة + حتمية', () => {
        const now = localDate(2026, 7, 1); // أربعاء
        const weekSat = getSaturdayOfWeekContaining(now);
        const mon = addDays(weekSat, 2);
        const nextWeek = addDays(weekSat, 8);
        const tasks = [
            baseTask({ id: 'w1', title: 'أسبوعي', parsedDate: mon }),
            baseTask({ id: 'd1', title: 'بعيد', parsedDate: nextWeek }),
            baseTask({
                id: 'f1',
                title: 'حتمي',
                parsedDate: addDays(now, 1),
                isFatalDeadline: true,
            }),
        ];
        const part = partitionAgendaPendingTasks(tasks, now);
        expect(part.weeklyDayBlocks).toHaveLength(7);
        expect(part.weeklyDayBlocks[2]?.tasks.map((t) => t.id)).toEqual(['w1']);
        expect(part.distantTasks.map((t) => t.id)).toContain('d1');
        expect(part.fatalTasks.map((t) => t.id)).toEqual(['f1']);
    });
});
