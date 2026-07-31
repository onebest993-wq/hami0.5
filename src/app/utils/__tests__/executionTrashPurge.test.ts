import { describe, expect, it } from 'vitest';
import {
    collectExpiredExecutionTrashIds,
    purgeExpiredExecutionsFromTrash,
    shouldAutoPurgeExecutionFromTrash,
} from '@/app/utils/executionTrash';

describe('executionTrash auto-purge', () => {
    it('detects expired trash rows', () => {
        const expired = {
            id: 'e1',
            executionTrashDeletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        };
        const fresh = {
            id: 'e2',
            executionTrashDeletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        };
        expect(shouldAutoPurgeExecutionFromTrash(expired)).toBe(true);
        expect(shouldAutoPurgeExecutionFromTrash(fresh)).toBe(false);
        expect(collectExpiredExecutionTrashIds([expired, fresh])).toEqual(['e1']);
        expect(purgeExpiredExecutionsFromTrash([expired, fresh]).map((f) => f.id)).toEqual(['e2']);
    });
});
