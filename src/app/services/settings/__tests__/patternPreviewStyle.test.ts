import { describe, expect, it } from 'vitest';
import { resolvePatternPreviewStyle } from '../surfaceAppearance';

describe('resolvePatternPreviewStyle', () => {
    it('يفرّق بوضوح بين خفيف ومتوسط وواضح', () => {
        const light = resolvePatternPreviewStyle('moroccan-zellige', '#E6C673', '#0c1524', 0.16, 'dark');
        const medium = resolvePatternPreviewStyle('moroccan-zellige', '#E6C673', '#0c1524', 0.4, 'dark');
        const clear = resolvePatternPreviewStyle('moroccan-zellige', '#E6C673', '#0c1524', 0.72, 'dark');
        expect((light.opacity as number) < (medium.opacity as number)).toBe(true);
        expect((medium.opacity as number) < (clear.opacity as number)).toBe(true);
        expect((light.opacity as number) < 0.45).toBe(true);
        expect((clear.opacity as number) > 0.7).toBe(true);
    });
});
