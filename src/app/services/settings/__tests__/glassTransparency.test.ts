import { describe, expect, it } from 'vitest';
import {
    glassTransparencyToOpacity,
    opacityToGlassTransparency,
    GLASS_TRANSPARENCY_PRESETS,
} from '../glassTransparency';

describe('glassTransparency presets', () => {
    it('يفرّق بوضوح بين خفيف ومتوسط وواضح', () => {
        const light = glassTransparencyToOpacity('light');
        const medium = glassTransparencyToOpacity('medium');
        const clear = glassTransparencyToOpacity('clear');
        expect(light).toBeLessThan(medium);
        expect(medium).toBeLessThan(clear);
        expect(light).toBeLessThanOrEqual(0.22);
        expect(clear).toBeGreaterThanOrEqual(0.8);
    });

    it('يعيد نفس المعرّف بعد التحويل ذهاباً وإياباً', () => {
        for (const preset of GLASS_TRANSPARENCY_PRESETS) {
            expect(opacityToGlassTransparency(glassTransparencyToOpacity(preset.id))).toBe(preset.id);
        }
    });
});
