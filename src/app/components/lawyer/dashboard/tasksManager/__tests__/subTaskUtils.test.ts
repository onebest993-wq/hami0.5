import { describe, expect, it } from 'vitest';
import type { LegalSubTask } from '@/app/types/TaskEngine';
import { partitionSubTasks, resolveSubTaskKind } from '../subTaskUtils';

function sub(id: string, title: string, kind?: LegalSubTask['kind'], location?: string | null): LegalSubTask {
    return { id, title, location: location ?? null, isCompleted: false, kind };
}

describe('subTaskUtils', () => {
    it('resolveSubTaskKind respects explicit kind', () => {
        expect(resolveSubTaskKind(sub('1', 'a', 'branch'), true)).toBe('branch');
        expect(resolveSubTaskKind(sub('1', 'a', 'field'), false)).toBe('field');
    });

    it('resolveSubTaskKind infers legacy field subtasks on location tasks', () => {
        expect(resolveSubTaskKind(sub('1', 'a'), true)).toBe('field');
        expect(resolveSubTaskKind(sub('1', 'a'), false)).toBe('branch');
    });

    it('partitionSubTasks splits field and branch lists', () => {
        const { fieldSubTasks, branchSubTasks } = partitionSubTasks(
            [sub('f', 'field step', 'field'), sub('b', 'branch step', 'branch'), sub('l', 'legacy')],
            true,
        );
        expect(fieldSubTasks.map((s) => s.id)).toEqual(['f', 'l']);
        expect(branchSubTasks.map((s) => s.id)).toEqual(['b']);
    });
});
