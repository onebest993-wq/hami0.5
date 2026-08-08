import { describe, expect, it } from 'vitest';
import {
    isAndroidNativeGlassPaint,
    mixHexColors,
    resolveGlassPanelBackground,
    tintHex,
} from '../glassSurfacePaint';

describe('glassSurfacePaint', () => {
    it('يمزج hex بشكل متوقع', () => {
        expect(mixHexColors('#ffffff', '#000000', 1)).toBe('rgb(255, 255, 255)');
        expect(mixHexColors('#ffffff', '#000000', 0)).toBe('rgb(0, 0, 0)');
        expect(mixHexColors('#808080', '#000000', 0.5)).toBe('rgb(64, 64, 64)');
    });

    it('tintHex يضيف لمسة على السطح', () => {
        const tinted = tintHex('#0A0F1C', '#E6C673', 0.16);
        expect(tinted).toMatch(/^rgb\(/);
        expect(tinted).not.toBe('rgb(10, 15, 28)');
    });

    it('يفرّق بوضوح بين خفيف وواضح على الويب بلا خلفية (rgba)', () => {
        const surface = tintHex('#0A0F1C', '#E6C673', 0.16);
        const light = resolveGlassPanelBackground(surface, '#0A0F1C', 0.1, false);
        const clear = resolveGlassPanelBackground(surface, '#0A0F1C', 0.85, false);
        expect(light).toMatch(/^rgba\(/);
        expect(clear).toMatch(/^rgba\(/);
        expect(light).not.toBe(clear);
    });

    it('Android بلا خلفية يستخدم rgb ممزوجاً موثوقاً', () => {
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'android';
        expect(isAndroidNativeGlassPaint()).toBe(true);

        const surface = tintHex('#0A0F1C', '#E6C673', 0.16);
        const light = resolveGlassPanelBackground(surface, '#0A0F1C', 0.1, false);
        const clear = resolveGlassPanelBackground(surface, '#0A0F1C', 0.85, false);
        expect(light).toMatch(/^rgb\(/);
        expect(clear).toMatch(/^rgb\(/);
        expect(light).not.toBe(clear);

        delete document.documentElement.dataset.hamiNative;
        delete document.documentElement.dataset.hamiPlatform;
    });

    it('وضع الخلفية يستخدم rgba شفاف', () => {
        const light = resolveGlassPanelBackground('#101828', '#0A0F1C', 0.1, true);
        const clear = resolveGlassPanelBackground('#101828', '#0A0F1C', 0.85, true);
        expect(light).toMatch(/^rgba\(/);
        expect(clear).toMatch(/^rgba\(/);
        expect(light).not.toBe(clear);
        const lightAlpha = Number(light.match(/,\s*([\d.]+)\s*\)$/)?.[1] ?? 1);
        const clearAlpha = Number(clear.match(/,\s*([\d.]+)\s*\)$/)?.[1] ?? 0);
        expect(lightAlpha).toBeLessThan(0.15);
        expect(clearAlpha).toBeGreaterThan(0.65);
    });
});
