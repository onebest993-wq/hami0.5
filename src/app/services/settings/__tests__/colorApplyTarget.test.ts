import { describe, expect, it } from 'vitest';
import {
    COLOR_APPLY_TARGET_OPTIONS,
    isPatternsColorTarget,
    normalizeColorApplyTarget,
} from '../surfaceApplyTarget';

describe('ColorApplyTarget', () => {
    it('يشمل تبويب النقوش الثالث', () => {
        expect(COLOR_APPLY_TARGET_OPTIONS).toHaveLength(3);
        expect(COLOR_APPLY_TARGET_OPTIONS.map((o) => o.value)).toEqual([
            'board',
            'blocks',
            'patterns',
        ]);
    });

    it('normalizeColorApplyTarget يحفظ patterns', () => {
        expect(normalizeColorApplyTarget('patterns')).toBe('patterns');
        expect(isPatternsColorTarget('patterns')).toBe(true);
        expect(isPatternsColorTarget('board')).toBe(false);
    });
});
