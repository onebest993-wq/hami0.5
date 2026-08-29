import { describe, expect, it } from 'vitest';
import { isUnchangedSlicePatch } from '../settingsPatchSkip';

describe('isUnchangedSlicePatch', () => {
    it('يعدّ التجزئة بلا تغيير إن تطابقت المفاتيح', () => {
        expect(isUnchangedSlicePatch({ a: 1, b: 'x' }, { a: 1 })).toBe(true);
        expect(isUnchangedSlicePatch({ a: 1, b: 'x' }, { a: 2 })).toBe(false);
        expect(isUnchangedSlicePatch({ a: 1 }, {})).toBe(true);
    });
});
