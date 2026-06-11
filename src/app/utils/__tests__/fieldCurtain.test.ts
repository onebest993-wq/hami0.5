import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '../fieldCurtain';

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
        status: 'pending',
        pinnedToFieldCurtain: partial.pinnedToFieldCurtain ?? false,
        fieldCurtainPinnedAt: null,
        completedAt: null,
        subTasks: partial.subTasks ?? [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('isTaskOnFieldCurtain', () => {
    it('returns true only when explicitly pinned', () => {
        expect(isTaskOnFieldCurtain(task({ id: '1', title: 'مثبت', pinnedToFieldCurtain: true }))).toBe(true);
        expect(isTaskOnFieldCurtain(task({ id: '2', title: 'موقع', location: 'بغداد' }))).toBe(false);
    });

    it('excludes fatal deadlines even when pinned', () => {
        expect(
            isTaskOnFieldCurtain(
                task({ id: '1', title: 'حتمي', pinnedToFieldCurtain: true, isFatalDeadline: true }),
            ),
        ).toBe(false);
    });
});
