import { describe, expect, it } from 'vitest';
import { replaceStageAt } from '../stageImmutable';

describe('replaceStageAt', () => {
    it('replaces the stage at index without mutating the source array', () => {
        const stages = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        const next = { id: 'b2' };
        const result = replaceStageAt(stages, 1, next);

        expect(result).toEqual([{ id: 'a' }, { id: 'b2' }, { id: 'c' }]);
        expect(result).not.toBe(stages);
        expect(stages[1]).toEqual({ id: 'b' });
    });

    it('returns the same array reference for out-of-range index', () => {
        const stages = [{ id: 'a' }];
        expect(replaceStageAt(stages, -1, { id: 'x' })).toBe(stages);
        expect(replaceStageAt(stages, 5, { id: 'x' })).toBe(stages);
    });
});
