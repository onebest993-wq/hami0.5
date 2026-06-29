import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    collectExecutionCascadeIds,
    mergeExecutionFilesPreservingLifecycle,
} from '@/app/utils/executionLifecycleMutations';

describe('executionLifecycleMutations', () => {
    it('collectExecutionCascadeIds includes unified child dossiers', () => {
        const files = [
            { id: 'parent-1' },
            { id: 'child-1', parentId: 'parent-1' },
            { id: 'other-1', parentId: 'parent-2' },
        ] as ExecutionFile[];

        expect(collectExecutionCascadeIds(files, 'parent-1').sort()).toEqual(['child-1', 'parent-1']);
    });

    it('mergeExecutionFilesPreservingLifecycle keeps in-memory trash over stale storage', () => {
        const inMemory = [
            {
                id: 'a',
                executionTrashDeletedAt: '2026-06-25T12:00:00.000Z',
            },
        ] as ExecutionFile[];
        const fromStorage = [{ id: 'a', fileNumber: '100' }] as ExecutionFile[];

        const merged = mergeExecutionFilesPreservingLifecycle(inMemory, fromStorage);
        expect(merged).toHaveLength(1);
        expect(merged[0]?.executionTrashDeletedAt).toBe('2026-06-25T12:00:00.000Z');
        expect(merged[0]?.fileNumber).toBe('100');
    });

    it('mergeExecutionFilesPreservingLifecycle keeps optimistic rows not yet persisted', () => {
        const inMemory = [{ id: 'new-1', fileNumber: '200' }] as ExecutionFile[];
        const merged = mergeExecutionFilesPreservingLifecycle(inMemory, []);
        expect(merged.map((f) => f.id)).toEqual(['new-1']);
    });
});
