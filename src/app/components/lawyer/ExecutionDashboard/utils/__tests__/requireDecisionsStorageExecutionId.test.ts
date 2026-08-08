import { describe, expect, it } from 'vitest';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '../requireDecisionsStorageExecutionId';

describe('requireDecisionsStorageExecutionId', () => {
    it('يفضّل decisionsStorageExecutionId من boot', () => {
        expect(
            requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId: 'parent-uuid',
                executionId: 'sub-uuid',
                executionData: { id: 'sub-uuid', parentDossierId: 'parent-uuid' },
            }),
        ).toBe('parent-uuid');
    });

    it('يحلّ من executionId + executionData عند غياب preset', () => {
        expect(
            requireDecisionsStorageExecutionId({
                executionId: 'sub-uuid',
                executionData: { id: 'sub-uuid', parentDossierId: 'parent-uuid' },
            }),
        ).toBe('parent-uuid');
    });

    it('coalesce يُرجع undefined عند default', () => {
        expect(coalesceDecisionsStorageExecutionId({})).toBeUndefined();
    });
});
