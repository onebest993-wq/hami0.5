import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    getBackgroundServicesDeferMs,
    getMobilePrefetchDelayMs,
    shouldRenderDecorativeLayers,
} from '../mobileRuntimePolicy';

describe('mobileRuntimePolicy', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiLite = '0';
    });

    afterEach(() => {
        delete document.documentElement.dataset.hamiLite;
        vi.unstubAllGlobals();
    });

    it('getMobilePrefetchDelayMs يضاعف التأخير في الوضع الخفيف', () => {
        document.documentElement.dataset.hamiLite = '1';
        expect(getMobilePrefetchDelayMs(8_000)).toBe(22_000);
        document.documentElement.dataset.hamiLite = '0';
        expect(getMobilePrefetchDelayMs(8_000)).toBe(8_000);
    });

    it('shouldRenderDecorativeLayers يعطّل الزخرفة في الوضع الخفيف', () => {
        document.documentElement.dataset.hamiLite = '1';
        expect(shouldRenderDecorativeLayers()).toBe(false);
        document.documentElement.dataset.hamiLite = '0';
        expect(shouldRenderDecorativeLayers()).toBe(true);
    });

    it('getBackgroundServicesDeferMs يزيد التأخير على الأجهزة الخفيفة', () => {
        document.documentElement.dataset.hamiLite = '1';
        const lite = getBackgroundServicesDeferMs();
        document.documentElement.dataset.hamiLite = '0';
        const normal = getBackgroundServicesDeferMs();
        expect(lite).toBeGreaterThan(normal);
    });
});
