import { describe, expect, it } from 'vitest';
import { buildExecutionJurisdictionCounts, getExecutionArchiveBasePool } from '../executionArchiveFilterUtils';
import type { LooseArchiveFile } from '../types';

describe('execution archive lifecycle counts', () => {
    const files = [
        { id: '1', claimType: 'استحصال دين مالي', status: 'active' },
        { id: '2', claimType: 'مشاهدة', classification: 'أحوال شخصية', status: 'active' },
        {
            id: '3',
            claimType: 'استحصال دين مالي',
            status: 'active',
            executionTrashDeletedAt: '2026-01-01T00:00:00.000Z',
        },
        {
            id: '4',
            claimType: 'استحصال دين مالي',
            status: 'active',
            executionArchivedAt: '2026-02-01T00:00:00.000Z',
        },
    ] as LooseArchiveFile[];

    it('isolates trash pool total independent of jurisdiction filter', () => {
        const trashPool = getExecutionArchiveBasePool(files, 'trash');
        expect(trashPool).toHaveLength(1);
        expect(buildExecutionJurisdictionCounts(trashPool).all).toBe(1);
        expect(buildExecutionJurisdictionCounts(trashPool).civil).toBe(1);
        expect(buildExecutionJurisdictionCounts(trashPool).sharia).toBe(0);
    });

    it('active pool excludes trash and archived', () => {
        const activePool = getExecutionArchiveBasePool(files, 'active');
        expect(activePool.map((f) => f.id)).toEqual(['1', '2']);
    });
});
