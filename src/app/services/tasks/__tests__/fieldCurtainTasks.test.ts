import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    countActiveFieldCurtainTasks,
    listActiveFieldCurtainTasks,
    sortFieldCurtainTasks,
} from '@/app/services/tasks/fieldCurtainTasks';

function task(partial: Partial<LegalTask> & Pick<LegalTask, 'id' | 'title'>): LegalTask {
    return {
        id: partial.id,
        rawText: partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: null,
        status: partial.status ?? 'pending',
        completedAt: partial.completedAt ?? null,
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        fieldCurtainPinnedAt: partial.fieldCurtainPinnedAt ?? null,
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('fieldCurtainTasks', () => {
    it('lists only pinned incomplete tasks', () => {
        const tasks = [
            task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }),
            task({ id: '2', title: 'منجز', pinnedToFieldCurtain: true, completedAt: new Date() }),
            task({ id: '3', title: 'عادي' }),
        ];
        expect(listActiveFieldCurtainTasks(tasks).map((t) => t.id)).toEqual(['1']);
        expect(countActiveFieldCurtainTasks(tasks)).toBe(1);
    });

    it('ignores fatal deadlines on curtain', () => {
        const tasks = [
            task({ id: '1', title: 'حتمي', pinnedToFieldCurtain: true, isFatalDeadline: true }),
        ];
        expect(countActiveFieldCurtainTasks(tasks)).toBe(0);
    });

    it('sorts by pin time then title', () => {
        const older = task({
            id: 'a',
            title: 'ب',
            pinnedToFieldCurtain: true,
            fieldCurtainPinnedAt: new Date('2026-01-01'),
        });
        const newer = task({
            id: 'b',
            title: 'أ',
            pinnedToFieldCurtain: true,
            fieldCurtainPinnedAt: new Date('2026-06-01'),
        });
        expect(sortFieldCurtainTasks([older, newer]).map((t) => t.id)).toEqual(['b', 'a']);
    });
});
