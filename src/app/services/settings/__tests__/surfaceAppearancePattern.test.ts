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
                backgroundPatternOpacity: 0.2,
                theme: 'navy',
                themeMode: 'dark',
            },
            true,
        );
        expect(style?.backgroundImage).toMatch(/^url\("data:image\/svg\+xml,/);
        expect(style?.backgroundRepeat).toBe('repeat');
        expect(typeof style?.opacity).toBe('number');
        expect((style?.opacity as number) >= 0.42).toBe(true);
    });
});

describe('resolveHomeBlockPatternStyle', () => {
    it('maps slider linearly so customizer intensity is visible on the card', () => {
        const low = resolveHomeBlockPatternStyle('moroccan-zellige', '#E6C673', 0.1, 'dark');
        const high = resolveHomeBlockPatternStyle('moroccan-zellige', '#E6C673', 0.78, 'dark');
        expect(high?.backgroundImage).toMatch(/^url\("data:image\/svg\+xml,/);
        expect((low?.opacity as number) < (high?.opacity as number)).toBe(true);
        expect((high?.opacity as number) >= 0.3).toBe(true);
        expect((high?.opacity as number) <= 0.5).toBe(true);
    });

    it('returns null for none', () => {
        expect(resolveHomeBlockPatternStyle('none', '#E6C673')).toBeNull();
    });
});

describe('resolvePatternLayerOpacity', () => {
    it('raises low saved opacities above an invisible floor', () => {
        expect(resolvePatternLayerOpacity(0.05, 'dark')).toBeGreaterThanOrEqual(0.42);
        expect(resolvePatternLayerOpacity(0.78, 'dark')).toBeLessThanOrEqual(1);
    });
});
