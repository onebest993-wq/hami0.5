import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, startOfLocalDay } from '@/app/utils/nlpParser';
import { groupTasksByTime } from '../groupTasksByTime';

function task(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.title,
        title: partial.title,
        location: null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: null,
        status: 'pending',
        pinnedToFieldCurtain: false,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('groupTasksByTime', () => {
    const ref = new Date(2026, 4, 16); // 2026-05-16 local

    it('puts fatal tasks in no bucket', () => {
        const fatal = task({
            id: 'f',
            title: 'حتمي',
            isFatalDeadline: true,
            parsedDate: ref,
        });
        const g = groupTasksByTime([fatal], ref);
        expect(g.overdue).toHaveLength(0);
        expect(g.today).toHaveLength(0);
        expect(g.tomorrow).toHaveLength(0);
        expect(g.unscheduled).toHaveLength(0);
    });

    it('classifies overdue, today, tomorrow, and future', () => {
        const today = startOfLocalDay(ref);
        const yesterday = addDays(today, -1);
        const tomorrow = addDays(today, 1);
        const nextWeek = addDays(today, 7);

        const g = groupTasksByTime(
            [
                task({ id: 'o', title: 'متأخر', parsedDate: yesterday }),
                task({ id: 't', title: 'اليوم', parsedDate: today }),
                task({ id: 'm', title: 'غداً', parsedDate: tomorrow }),
                task({ id: 'u', title: 'لاحق', parsedDate: nextWeek }),
                task({ id: 'n', title: 'بدون تاريخ', parsedDate: null }),
            ],
            ref,
        );

        expect(g.overdue.map((x) => x.id)).toEqual(['o']);
        expect(g.today.map((x) => x.id)).toEqual(['t']);
        expect(g.tomorrow.map((x) => x.id)).toEqual(['m']);
        expect(g.unscheduled.map((x) => x.id).sort()).toEqual(['n', 'u']);
    });
});
