import { describe, expect, it } from 'vitest';
import {
    opacityToPatternIntensity,
    patternIntensityToOpacity,
    PATTERN_INTENSITY_PRESETS,
} from '../patternIntensity';
import { shapeKeyToHomeBlockShape, resolveHomeBlockClassNames } from '../resolveHomeBlockStyle';

describe('patternIntensity', () => {
    it('maps opacity to preset levels and back', () => {
        expect(opacityToPatternIntensity(0.08)).toBe('light');
        expect(opacityToPatternIntensity(0.32)).toBe('medium');
        expect(opacityToPatternIntensity(0.78)).toBe('clear');
        expect(patternIntensityToOpacity('medium')).toBe(0.32);
        expect(PATTERN_INTENSITY_PRESETS).toHaveLength(3);
    });
});

describe('shapeKeyToHomeBlockShape', () => {
    it('maps global square to block sharp and applies in class names', () => {
        expect(shapeKeyToHomeBlockShape('square')).toBe('sharp');
        expect(resolveHomeBlockClassNames(undefined, 'pill')).toContain('rounded-[2rem]');
        expect(resolveHomeBlockClassNames(undefined, 'square')).toContain('rounded-xl');
        expect(resolveHomeBlockClassNames(undefined)).toContain('hami-home-block-solid');
        expect(resolveHomeBlockClassNames(undefined)).not.toContain('hami-sovereign-glass');
    });
});
