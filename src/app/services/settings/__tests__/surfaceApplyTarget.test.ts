import { describe, expect, it } from 'vitest';
import {
    appliesToBoard,
    appliesToBlocks,
    normalizeSurfaceApplyTarget,
    SURFACE_APPLY_TARGET_OPTIONS,
} from '../surfaceApplyTarget';

describe('surfaceApplyTarget', () => {
    it('normalizeSurfaceApplyTarget يفترض both', () => {
        expect(normalizeSurfaceApplyTarget(undefined)).toBe('both');
        expect(normalizeSurfaceApplyTarget('board')).toBe('board');
        expect(normalizeSurfaceApplyTarget('blocks')).toBe('blocks');
        expect(normalizeSurfaceApplyTarget('nope')).toBe('both');
    });

    it('appliesToBoard / appliesToBlocks', () => {
        expect(appliesToBoard('board')).toBe(true);
        expect(appliesToBlocks('board')).toBe(false);
        expect(appliesToBoard('blocks')).toBe(false);
        expect(appliesToBlocks('blocks')).toBe(true);
        expect(appliesToBoard('both')).toBe(true);
        expect(appliesToBlocks('both')).toBe(true);
    });

    it('خيارات الواجهة ثلاثية', () => {
        expect(SURFACE_APPLY_TARGET_OPTIONS.map((o) => o.value)).toEqual([
            'board',
            'blocks',
            'both',
        ]);
    });
});
