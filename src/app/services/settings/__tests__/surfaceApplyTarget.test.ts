import { describe, expect, it } from 'vitest';
import {
    appliesToBoard,
    appliesToBlocks,
    normalizeSurfaceApplyTarget,
    SURFACE_APPLY_TARGET_OPTIONS,
} from '../surfaceApplyTarget';

describe('surfaceApplyTarget', () => {
    it('normalizeSurfaceApplyTarget يفترض board', () => {
        expect(normalizeSurfaceApplyTarget(undefined)).toBe('board');
        expect(normalizeSurfaceApplyTarget('board')).toBe('board');
        expect(normalizeSurfaceApplyTarget('blocks')).toBe('blocks');
        expect(normalizeSurfaceApplyTarget('both')).toBe('both');
        expect(normalizeSurfaceApplyTarget('nope')).toBe('board');
    });

    it('appliesToBoard / appliesToBlocks', () => {
        expect(appliesToBoard('board')).toBe(true);
        expect(appliesToBlocks('board')).toBe(false);
        expect(appliesToBoard('blocks')).toBe(false);
        expect(appliesToBlocks('blocks')).toBe(true);
        expect(appliesToBoard('both')).toBe(true);
        expect(appliesToBlocks('both')).toBe(true);
    });

    it('خيارات الواجهة ثنائية (لوحة + أقسام)', () => {
        expect(SURFACE_APPLY_TARGET_OPTIONS.map((o) => o.value)).toEqual(['board', 'blocks']);
    });
});
