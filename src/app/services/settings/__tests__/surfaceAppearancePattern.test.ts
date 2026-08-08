import { describe, expect, it } from 'vitest';
import {
    resolveHomeBlockPatternStyle,
    resolvePatternLayerOpacity,
    resolvePatternOverlayStyle,
} from '../surfaceAppearance';

describe('resolvePatternOverlayStyle', () => {
    it('returns null when disabled or none', () => {
        expect(
            resolvePatternOverlayStyle(
                {
                    backgroundPreset: 'moroccan-zellige',
                    backgroundPatternOpacity: 0.4,
                    theme: 'gold',
                    themeMode: 'dark',
                },
                false,
            ),
        ).toBeNull();
        expect(
            resolvePatternOverlayStyle(
                {
                    backgroundPreset: 'none',
                    backgroundPatternOpacity: 0.4,
                    theme: 'gold',
                    themeMode: 'dark',
                },
                true,
            ),
        ).toBeNull();
    });

    it('builds a visible svg layer for a known preset', () => {
        const style = resolvePatternOverlayStyle(
            {
                backgroundPreset: 'babylon-gate',
                backgroundPatternOpacity: 0.32,
                theme: 'navy',
                themeMode: 'dark',
            },
            true,
        );
        expect(style?.backgroundImage).toMatch(/^url\("data:image\/svg\+xml,/);
        expect(style?.backgroundRepeat).toBe('repeat');
        expect(typeof style?.opacity).toBe('number');
        expect((style?.opacity as number) > 0.1).toBe(true);
    });
});

describe('resolveHomeBlockPatternStyle', () => {
    it('maps intensity linearly — خفيف أضعف بكثير من واضح', () => {
        const low = resolveHomeBlockPatternStyle('moroccan-zellige', '#E6C673', 0.08, 'dark');
        const mid = resolveHomeBlockPatternStyle('moroccan-zellige', '#E6C673', 0.32, 'dark');
        const high = resolveHomeBlockPatternStyle('moroccan-zellige', '#E6C673', 0.78, 'dark');
        expect(high?.backgroundImage).toMatch(/^url\("data:image\/svg\+xml,/);
        const lowOp = low?.opacity as number;
        const midOp = mid?.opacity as number;
        const highOp = high?.opacity as number;
        expect(lowOp).toBeLessThan(midOp);
        expect(midOp).toBeLessThan(highOp);
        expect(lowOp).toBeLessThan(0.12);
        expect(highOp).toBeGreaterThan(0.55);
    });

    it('returns null for none', () => {
        expect(resolveHomeBlockPatternStyle('none', '#E6C673')).toBeNull();
    });
});

describe('resolvePatternLayerOpacity', () => {
    it('يسمح بخفيف بالكاد ظاهر دون أرضية 0.42', () => {
        expect(resolvePatternLayerOpacity(0.08, 'dark')).toBeLessThan(0.12);
        expect(resolvePatternLayerOpacity(0.78, 'dark')).toBeGreaterThan(0.55);
        expect(resolvePatternLayerOpacity(0.08, 'dark')).toBeLessThan(
            resolvePatternLayerOpacity(0.32, 'dark'),
        );
    });
});
