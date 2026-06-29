import { describe, expect, it } from 'vitest';
import {
    isModestDevice,
    normalizeLitePerformanceMode,
    resolveLitePerformance,
} from '../devicePerformanceTier';

describe('devicePerformanceTier', () => {
    it('normalizeLitePerformanceMode يعيد auto للقيم غير المعروفة', () => {
        expect(normalizeLitePerformanceMode('auto')).toBe('auto');
        expect(normalizeLitePerformanceMode('on')).toBe('on');
        expect(normalizeLitePerformanceMode('off')).toBe('off');
        expect(normalizeLitePerformanceMode(undefined)).toBe('auto');
        expect(normalizeLitePerformanceMode('bogus')).toBe('auto');
    });

    it('resolveLitePerformance يحترم on/off', () => {
        expect(resolveLitePerformance('on')).toBe(true);
        expect(resolveLitePerformance('off')).toBe(false);
    });

    it('isModestDevice يُرجع false بدون navigator', () => {
        const original = globalThis.navigator;
        // @ts-expect-error test stub
        delete globalThis.navigator;
        expect(isModestDevice()).toBe(false);
        globalThis.navigator = original;
    });
});
