import { describe, expect, it } from 'vitest';
import { resolveFileSearchLifecycle } from '@/app/services/searchLifecycle';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('resolveFileSearchLifecycle', () => {
    it('marks lawsuit trash as deleted', () => {
        const f = {
            id: 1,
            type: 'lawsuit',
            status: 'deleted',
            caseNo: '1',
            court: 'c',
            parties: [],
            history: [],
            notes: [],
            images: [],
            date: '',
            tasks: [],
            deletedAt: Date.now(),
        } as FileData;
        expect(resolveFileSearchLifecycle(f)).toBe('deleted');
    });

    it('marks archived lawsuit as archived', () => {
        const f = {
            id: 2,
            type: 'lawsuit',
            status: 'archived',
            caseNo: '2',
            court: 'c',
            parties: [],
            history: [],
            notes: [],
            images: [],
            date: '',
            tasks: [],
        } as FileData;
        expect(resolveFileSearchLifecycle(f)).toBe('archived');
    });

    it('marks execution trash via executionTrashDeletedAt', () => {
        const f = {
            id: 3,
            type: 'execution',
            status: 'active',
            caseNo: '3',
            court: 'c',
            parties: [],
            history: [],
            notes: [],
            images: [],
            date: '',
            tasks: [],
            executionTrashDeletedAt: new Date().toISOString(),
        } as FileData & { executionTrashDeletedAt: string };
        expect(resolveFileSearchLifecycle(f)).toBe('deleted');
    });
});
