import { describe, expect, it } from 'vitest';
import {
    isLawsuitFileArchived,
    isLawsuitFileMutationBlocked,
    rejectLawsuitFileMutation,
} from '../lawsuitFileMutationGuard';

describe('lawsuitFileMutationGuard', () => {
    it('blocks archived and deleted files', () => {
        expect(isLawsuitFileArchived({ status: 'archived' })).toBe(true);
        expect(isLawsuitFileMutationBlocked({ status: 'deleted' })).toBe(true);
        expect(isLawsuitFileMutationBlocked({ status: 'active' })).toBe(false);
    });

    it('returns Arabic rejection messages', () => {
        expect(rejectLawsuitFileMutation({ status: 'archived' })).toContain('مؤرشفة');
        expect(rejectLawsuitFileMutation({ status: 'deleted' })).toContain('المحذوفات');
        expect(rejectLawsuitFileMutation({ status: 'active' })).toBeNull();
    });
});
